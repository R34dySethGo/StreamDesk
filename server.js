// Timer countdown logic - FIXED!
setInterval(() => {
  const timer = userState.timer;
  
  if (!timer.isRunning || timer.isPaused || !timer.endTime) {
    return;
  }
  
  // Calculate remaining from endTime
  const now = Date.now();
  const remaining = Math.ceil((timer.endTime - now) / 1000); // ← HIER: Math.ceil statt Math.floor!
  timer.remaining = Math.max(0, remaining);
  
  // Auto-extend after timer reaches 0
  if (timer.remaining <= 0 && !timer.autoExtendTime) {
    timer.autoExtendTime = Date.now() + 30000;
    console.log('Timer ended. Auto-extend in 30 seconds...');
  }
  
  if (timer.autoExtendTime && Date.now() >= timer.autoExtendTime) {
    const extension = 5 * 60;
    timer.duration += extension;
    timer.remaining = extension;
    timer.endTime = Date.now() + (extension * 1000);
    timer.autoExtendTime = null;
    console.log('Timer auto-extended by 5 minutes');
  }
}, 1000);
