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
  
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused
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
  
  res.json({
    duration: timerState.duration,
    remaining: timerState.pausedRemaining,
    endTime: null,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused
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
  
  const remaining = getTimerRemaining();
  const endTime = getTimerEndTime();
  
  res.json({
    duration: timerState.duration,
    remaining: remaining,
    endTime: endTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused
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
  
  res.json({ language: timerState.language });
});
