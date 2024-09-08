let minutes = 25;
let seconds = 0;
let isRunning = false;
let intervalId = null;
let cycleCount = 0;
let cycleCountTracker = 0;
let currentState = "pomodoro";
let timerPaused = false;
let timerWindowId = null;

const TimerType = {
  POMODORO: "pomodoro",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
};

const TimerDuration = {
  [TimerType.POMODORO]: {minutes: 25, seconds: 0},
  [TimerType.SHORT_BREAK]: {minutes: 5, seconds: 0},
  [TimerType.LONG_BREAK]: {minutes: 15, seconds: 0},
};

function openTimerWindow() {
  if (timerWindowId === null) {
    chrome.windows.create(
      {
        url: "popup.html",
        type: "popup",
        width: 500,
        height: 350,
      },
      (window) => {
        timerWindowId = window.id;
      }
    );
  } else {
    chrome.windows.update(timerWindowId, {focused: true});
  }
}

function handleManualStart(type) {
  if (isRunning) {
    return;
  }
  switch (type) {
    case TimerType.POMODORO:
      pauseCountdown();
      setTimerType(TimerType.POMODORO);
      break;
    case TimerType.SHORT_BREAK:
      pauseCountdown();
      setTimerType(TimerType.SHORT_BREAK);
      break;
    case TimerType.LONG_BREAK:
      pauseCountdown();
      setTimerType(TimerType.LONG_BREAK);
      break;
  }
  resetTimer();
}

function setTimerType(timerType) {
  currentState = timerType;
  setTimerDuration(timerType);
  resetTimer();
  startCountdown();
  updateBadge(minutes, seconds, TimerColor[timerType]);
}

const BadgeColor = {
  [TimerType.POMODORO]: "#f05b56",
  [TimerType.SHORT_BREAK]: "#38858a",
  [TimerType.LONG_BREAK]: "#397097",
};

function updateBadge(minutes, seconds, color) {
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  chrome.action.setBadgeText({text: formattedTime});
  chrome.action.setBadgeBackgroundColor({color: color});
}

function startCountdown() {
  if (intervalId) clearInterval(intervalId);

  let windowOpened = false;

  intervalId = setInterval(() => {
    if (minutes > 0 || seconds > 0) {
      if (seconds === 0) {
        minutes--;
        seconds = 59;
      } else {
        seconds--;
      }

      const totalSeconds = minutes * 60 + seconds;
      if (totalSeconds <= 3 && !windowOpened) {
        openTimerWindow();
        windowOpened = true;
      }
    } else {
      clearInterval(intervalId);
      setTimeout(() => {
        cycleCount++;
        cycleCountTracker++;
        if (cycleCount === 6) {
          cycleCount = 0;
        }
        handleCycle();
      }, 1000);
    }
    updatePopup();
    updateBadge(minutes, seconds, BadgeColor[currentState]);
  }, 1000);

  isRunning = true;
}

function pauseCountdown() {
  clearInterval(intervalId);
  isRunning = false;
  updatePopup();
}

function resetTimer() {
  clearInterval(intervalId);
  isRunning = false;
  setTimerDuration(currentState);
  updatePopup();
}

function handleCycle() {
  switch (cycleCount) {
    case 1:
    case 3:
      setTimerType(TimerType.SHORT_BREAK);
      break;
    case 5:
      setTimerType(TimerType.LONG_BREAK);
      break;
    default:
      setTimerType(TimerType.POMODORO);
      break;
  }
  updateBadge(minutes, seconds, BadgeColor[currentState]);
}

function setTimerType(timerType) {
  currentState = timerType;
  setTimerDuration(timerType);
  resetTimer();
  startCountdown();
}

function setTimerDuration(timerType) {
  const duration = TimerDuration[timerType];
  minutes = duration.minutes;
  seconds = duration.seconds;
}

function updatePopup() {
  chrome.runtime.sendMessage({
    action: "updateTimer",
    timer: {
      minutes,
      seconds,
      isRunning,
      cycleCount,
      cycleCountTracker,
      currentState,
    },
  });
}

chrome.action.onClicked.addListener((tab) => {
  openTimerWindow();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === timerWindowId) {
    timerWindowId = null;
  }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "settings" && changes["timer"]) {
    const timer = changes["timer"].newValue;
    updateBadge(timer.minutes, timer.seconds);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "start":
      if (!isRunning) startCountdown();
      break;
    case "pause":
      if (isRunning) pauseCountdown();
      break;
    case "reset":
      resetTimer();
      break;
    case "setTimer":
      setTimerType(request.timerType);

      break;
    case "handleManualStart":
      handleManualStart(request.type);
      break;
    case "openPopup":
      chrome.tabs.create({url: "popup.html"});
      break;
    case "getState":
      sendResponse({
        minutes,
        seconds,
        isRunning,
        cycleCount,
        cycleCountTracker,
        currentState,
      });
      break;
  }
  return true;
});
