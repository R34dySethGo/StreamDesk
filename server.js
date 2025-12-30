const express = require('express');
const path = require('path');
const fs = require('fs');
const speakeasy = require('speakeasy');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============================================
// CONFIGURATION
// ============================================

const TOTP_SECRET = process.env.TOTP_SECRET || 'NONE';
const AUTH_REQUIRED = TOTP_SECRET !== 'NONE';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';

// ============================================
// STATE STORAGE
// ============================================

let sessionStore = {};
let spotifyTokens = {
  access_token: null,
  refresh_token: null,
  expires_at: null
};

let popupState = {
  isActive: false,
  selectedVideos: []
};

let popupPlaylist = {
  currentIndex: 0,
  lastPlayedAt: null,
  isWaiting: false,
  waitMinutes: 10
};

// Timer State
let timerState = {
  duration: 0,
  startTime: null,
  pausedAt: null,
  pausedRemaining: 0,
  isRunning: false,
  isPaused: false,
  wasSkipped: false,
  language: 'de'
};

// ============================================
// TIMER HELPERS
// ============================================

function getTimerRemaining() {
  if (!timerState.isRunning) {
    return 0;
  }
  
  if (timerState.isPaused) {
    return timerState.pausedRemaining;
  }
  
  const now = Date.now();
  const elapsed = Math.floor((now - timerState.startTime) / 1000);
  const remaining = Math.max(0, timerState.duration - elapsed);
  
  return remaining;
}

function getTimerEndTime() {
  if (!timerState.isRunning || timerState.isPaused) {
    return null;
  }
  
  return timerState.startTime + (timerState.duration * 1000);
}

// ============================================
// AUTH MIDDLEWARE
// ============================================

function getUserFromSession(req, res, next) {
  if (!AUTH_REQUIRED) {
    req.user = { name: 'Guest', avatar: 'none.png' };
    return next();
  }
  
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId || !sessionStore[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = sessionStore[sessionId];
  next();
}

// ============================================
// AUTH ROUTES
// ============================================

app.get('/api/instance/info', (req, res) => {
  res.json({
    authRequired: AUTH_REQUIRED,
    hasSpotify: !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { code, sessionId } = req.body;
  
  if (!AUTH_REQUIRED) {
    const user = { name: 'Guest', avatar: 'none.png' };
    sessionStore[sessionId] = user;
    return res.json({ success: true, user });
  }
  
  const verified = speakeasy.totp.verify({
    secret: TOTP_SECRET,
    encoding: 'base32',
    token: code,
    window: 2
  });
  
  if (verified) {
    const userFiles = fs.readdirSync(path.join(__dirname, 'public', 'user'))
      .filter(f => f.endsWith('.png'));
    
    const avatarFile = userFiles.length > 0 ? userFiles[0] : 'none.png';
    const userName = avatarFile.replace('.png', '');
    
    const user = { name: userName, avatar: avatarFile };
    sessionStore[sessionId] = user;
    
    console.log(`[AUTH] User logged in: ${userName}`);
    return res.json({ success: true, user });
  }
  
  res.json({ success: false });
});

// ============================================
// TIMER ROUTES
// ============================================

app.get('/api/timer', getUserFromSession, (req, res) => {
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    wasSkipped: timerState.wasSkipped,
    language: timerState.language
  });
});

app.get('/api/timer/public', (req, res) => {
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    wasSkipped: timerState.wasSkipped,
    language: timerState.language
  });
});

app.post('/api/timer/start', getUserFromSession, (req, res) => {
  const { minutes } = req.body;
  
  if (!minutes || minutes <= 0) {
    return res.status(400).json({ error: 'Invalid minutes' });
  }
  
  const seconds = minutes * 60;
  
  timerState.duration = seconds;
  timerState.startTime = Date.now();
  timerState.pausedAt = null;
  timerState.pausedRemaining = 0;
  timerState.isRunning = true;
  timerState.isPaused = false;
  timerState.wasSkipped = false;
  
  console.log(`[TIMER] Started: ${minutes} min (${seconds}s)`);
  console.log(`[TIMER] End time: ${new Date(getTimerEndTime()).toISOString()}`);
  
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    wasSkipped: false
  });
});

app.post('/api/timer/pause', getUserFromSession, (req, res) => {
  if (!timerState.isRunning) {
    return res.status(400).json({ error: 'Timer not running' });
  }
  
  if (timerState.isPaused) {
    return res.status(400).json({ error: 'Timer already paused' });
  }
  
  timerState.pausedRemaining = getTimerRemaining();
  timerState.pausedAt = Date.now();
  timerState.isPaused = true;
  
  console.log(`[TIMER] Paused at ${timerState.pausedRemaining}s remaining`);
  
  res.json({
    duration: timerState.duration,
    remaining: timerState.pausedRemaining,
    endTime: null,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    wasSkipped: timerState.wasSkipped
  });
});

app.post('/api/timer/resume', getUserFromSession, (req, res) => {
  if (!timerState.isRunning) {
    return res.status(400).json({ error: 'Timer not running' });
  }
  
  if (!timerState.isPaused) {
    return res.status(400).json({ error: 'Timer not paused' });
  }
  
  timerState.duration = timerState.pausedRemaining;
  timerState.startTime = Date.now();
  timerState.pausedAt = null;
  timerState.isPaused = false;
  
  console.log(`[TIMER] Resumed with ${timerState.duration}s remaining`);
  console.log(`[TIMER] New end time: ${new Date(getTimerEndTime()).toISOString()}`);
  
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    wasSkipped: timerState.wasSkipped
  });
});

app.post('/api/timer/reset', getUserFromSession, (req, res) => {
  const wasRunning = timerState.isRunning && getTimerRemaining() > 0;
  
  timerState.duration = 0;
  timerState.startTime = null;
  timerState.pausedAt = null;
  timerState.pausedRemaining = 0;
  timerState.isRunning = false;
  timerState.isPaused = false;
  timerState.wasSkipped = wasRunning;
  
  console.log(`[TIMER] Reset. Was skipped: ${wasRunning}`);
  
  res.json({
    duration: 0,
    remaining: 0,
    endTime: null,
    isRunning: false,
    isPaused: false,
    wasSkipped: wasRunning,
    language: timerState.language
  });
});

app.post('/api/timer/language', getUserFromSession, (req, res) => {
  const { language } = req.body;
  
  if (language !== 'de' && language !== 'en') {
    return res.status(400).json({ error: 'Invalid language' });
  }
  
  timerState.language = language;
  console.log(`[TIMER] Language changed to: ${language}`);
  
  res.json({ language: timerState.language });
});

// ============================================
// POPUP ROUTES
// ============================================

app.get('/api/popup/videos', getUserFromSession, (req, res) => {
  const popDir = path.join(__dirname, 'public', 'pop');
  
  if (!fs.existsSync(popDir)) {
    return res.json({ videos: [] });
  }
  
  const videos = fs.readdirSync(popDir)
    .filter(f => f.endsWith('.mp4'))
    .sort();
  
  res.json({ videos });
});

app.get('/api/popup/state', getUserFromSession, (req, res) => {
  res.json(popupState);
});

app.post('/api/popup/state', getUserFromSession, (req, res) => {
  const { isActive, selectedVideos } = req.body;
  
  if (typeof isActive !== 'undefined') {
    const wasInactive = !popupState.isActive;
    popupState.isActive = isActive;
    
    // Reset playlist when activating
    if (isActive && wasInactive) {
      popupPlaylist.currentIndex = 0;
      popupPlaylist.lastPlayedAt = null;
      popupPlaylist.isWaiting = false;
      console.log('[POPUP] Activated - playlist reset, ready to play first video');
    }
  }
  
  if (Array.isArray(selectedVideos)) {
    popupState.selectedVideos = selectedVideos;
  }
  
  console.log('[POPUP] State updated:', popupState);
  console.log('[POPUP] Playlist:', popupPlaylist);
  res.json(popupState);
});

app.get('/api/popup/current', (req, res) => {
  if (!popupState.isActive || popupState.selectedVideos.length === 0) {
    return res.json({ video: null });
  }
  
  const now = Date.now();
  
  // If waiting for cooldown
  if (popupPlaylist.isWaiting && popupPlaylist.lastPlayedAt) {
    const elapsed = Math.floor((now - popupPlaylist.lastPlayedAt) / 1000 / 60);
    const waitTime = popupPlaylist.waitMinutes;
    
    if (elapsed < waitTime) {
      console.log(`[POPUP] Still waiting... ${elapsed}/${waitTime} min elapsed`);
      return res.json({ video: null });
    }
    
    // Cooldown over, ready to play next
    popupPlaylist.isWaiting = false;
    console.log('[POPUP] Cooldown finished, ready for next video');
  }
  
  // Get current video
  const video = popupState.selectedVideos[popupPlaylist.currentIndex];
  
  if (!video) {
    console.error('[POPUP] No video at index', popupPlaylist.currentIndex);
    return res.json({ video: null });
  }
  
  console.log(`[POPUP] Serving video ${popupPlaylist.currentIndex + 1}/${popupState.selectedVideos.length}: ${video}`);
  res.json({ video });
});

app.post('/api/popup/ended', (req, res) => {
  console.log('[POPUP] Video ended notification received');
  
  // Move to next video
  popupPlaylist.currentIndex = (popupPlaylist.currentIndex + 1) % popupState.selectedVideos.length;
  popupPlaylist.lastPlayedAt = Date.now();
  popupPlaylist.isWaiting = true;
  
  console.log(`[POPUP] Next video index: ${popupPlaylist.currentIndex}, waiting ${popupPlaylist.waitMinutes} min`);
  
  res.json({ success: true });
});

// ============================================
// SPOTIFY ROUTES
// ============================================

app.get('/spotify/login', (req, res) => {
  const scopes = 'user-read-playback-state user-modify-playback-state';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.send('<script>window.close();</script>');
  }
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });
    
    const data = await response.json();
    
    spotifyTokens.access_token = data.access_token;
    spotifyTokens.refresh_token = data.refresh_token;
    spotifyTokens.expires_at = Date.now() + (data.expires_in * 1000);
    
    console.log('[SPOTIFY] Connected successfully');
    res.send('<script>window.close();</script>');
  } catch (err) {
    console.error('[SPOTIFY] Auth error:', err);
    res.send('<script>window.close();</script>');
  }
});

async function refreshSpotifyToken() {
  if (!spotifyTokens.refresh_token) return false;
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: spotifyTokens.refresh_token
      })
    });
    
    const data = await response.json();
    
    spotifyTokens.access_token = data.access_token;
    spotifyTokens.expires_at = Date.now() + (data.expires_in * 1000);
    
    console.log('[SPOTIFY] Token refreshed');
    return true;
  } catch (err) {
    console.error('[SPOTIFY] Refresh error:', err);
    return false;
  }
}

async function spotifyRequest(endpoint, options = {}) {
  if (!spotifyTokens.access_token) {
    throw new Error('Not authenticated');
  }
  
  if (Date.now() >= spotifyTokens.expires_at) {
    await refreshSpotifyToken();
  }
  
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${spotifyTokens.access_token}`
    }
  });
  
  if (!response.ok && response.status !== 204) {
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

app.get('/api/spotify/state', getUserFromSession, async (req, res) => {
  try {
    const state = await spotifyRequest('/me/player');
    
    if (!state) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      isPlaying: state.is_playing,
      volume: state.device.volume_percent
    });
  } catch (err) {
    res.json({ connected: false });
  }
});

app.post('/api/spotify/playpause', getUserFromSession, async (req, res) => {
  try {
    const state = await spotifyRequest('/me/player');
    
    if (state.is_playing) {
      await spotifyRequest('/me/player/pause', { method: 'PUT' });
    } else {
      await spotifyRequest('/me/player/play', { method: 'PUT' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[SPOTIFY] Play/Pause error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/spotify/skip', getUserFromSession, async (req, res) => {
  try {
    await spotifyRequest('/me/player/next', { method: 'POST' });
    res.json({ success: true });
  } catch (err) {
    console.error('[SPOTIFY] Skip error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/spotify/volume', getUserFromSession, async (req, res) => {
  const { volume } = req.body;
  
  try {
    await spotifyRequest(`/me/player/volume?volume_percent=${volume}`, { method: 'PUT' });
    res.json({ success: true });
  } catch (err) {
    console.error('[SPOTIFY] Volume error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 StreamDesk running on port ${PORT}`);
  console.log(`🔐 Auth: ${AUTH_REQUIRED ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🎵 Spotify: ${SPOTIFY_CLIENT_ID ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
});
