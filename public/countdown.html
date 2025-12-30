<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Countdown</title>
  <style>
    @font-face {
      font-family: 'StreamFont';
      src: url('/fonts/font.ttf') format('truetype');
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: transparent;
      font-family: 'StreamFont', Arial, sans-serif;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      overflow: hidden;
    }
    
    .countdown-container {
      text-align: center;
      padding: 40px;
    }
    
    .countdown-time {
      font-size: 120px;
      font-weight: bold;
      text-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
      margin-bottom: 20px;
    }
    
    .countdown-bar {
      width: 600px;
      height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      overflow: hidden;
      margin: 0 auto 20px;
    }
    
    .countdown-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.5s linear;
      border-radius: 10px;
    }
    
    .countdown-end {
      font-size: 24px;
      opacity: 0.8;
      margin-bottom: 10px;
    }
    
    .countdown-skipped {
      font-size: 28px;
      color: #FF5722;
      font-weight: bold;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="countdown-container">
    <div class="countdown-time" id="countdownTime">00:00</div>
    <div class="countdown-bar">
      <div class="countdown-bar-fill" id="countdownBar"></div>
    </div>
    <div class="countdown-end" id="countdownEnd">Ungefähr um --:-- Uhr</div>
    <div class="countdown-skipped hidden" id="countdownSkipped">Pause wurde übersprungen</div>
  </div>

  <script>
    const API_URL = window.location.origin;
    
    const timeEl = document.getElementById('countdownTime');
    const barEl = document.getElementById('countdownBar');
    const endEl = document.getElementById('countdownEnd');
    const skippedEl = document.getElementById('countdownSkipped');
    
    const texts = {
      de: {
        around: 'Ungefähr um',
        clock: 'Uhr',
        skipped: 'Pause wurde übersprungen'
      },
      en: {
        around: 'Around',
        clock: "o'clock",
        skipped: 'Break was skipped'
      }
    };
    
    let currentLang = 'de';
    
    async function updateCountdown() {
      try {
        const res = await fetch(`${API_URL}/api/timer/public`);
        const timer = await res.json();
        
        currentLang = timer.language || 'de';
        
        if (timer.isRunning && timer.remaining > 0) {
          const mins = Math.floor(timer.remaining / 60);
          const secs = timer.remaining % 60;
          timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          
          const percent = (timer.remaining / timer.duration) * 100;
          barEl.style.width = `${percent}%`;
          
          if (timer.endTime) {
            const endDate = new Date(timer.endTime);
            const hours = endDate.getHours().toString().padStart(2, '0');
            const minutes = endDate.getMinutes().toString().padStart(2, '0');
            endEl.textContent = `${texts[currentLang].around} ${hours}:${minutes} ${texts[currentLang].clock}`;
          } else {
            endEl.textContent = '--:--';
          }
          
          skippedEl.classList.add('hidden');
        } else {
          timeEl.textContent = '00:00';
          barEl.style.width = '0%';
          endEl.textContent = '--:--';
          
          if (timer.wasSkipped) {
            skippedEl.textContent = texts[currentLang].skipped;
            skippedEl.classList.remove('hidden');
          } else {
            skippedEl.classList.add('hidden');
          }
        }
      } catch (err) {
        console.error('Update countdown error:', err);
      }
    }
    
    setInterval(updateCountdown, 100);
    updateCountdown();
  </script>
</body>
</html>
