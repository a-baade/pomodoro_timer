document.addEventListener("DOMContentLoaded", function () {
  const stopwatch = document.getElementById("stopwatch");
  const startButton = document.getElementById("startButton");
  const shortBreakButton = document.getElementById("shortBreakButton");
  const longBreakButton = document.getElementById("longBreakButton");
  const pomodoroButton = document.getElementById("pomodoroButton");

  let backgroundColors = {
    pomodoro: "#f05b56",
    shortBreak: "#38858a",
    longBreak: "#397097",
  };

  let alarmInstance = null;
  let alarmPlayed = false;

  function playAlarmSound() {
    if (!alarmPlayed) {
      if (alarmInstance) {
        alarmInstance.pause();
        alarmInstance.currentTime = 0;
      }

      alarmInstance = new Audio("./alarm_sound.mp3");
      alarmInstance
        .play()
        .catch((error) => console.error("Error playing audio:", error));

      alarmPlayed = true;
      alarmTimeoutId = setTimeout(() => {
        alarmPlayed = false;
        if (alarmInstance) {
          alarmInstance.pause();
          alarmInstance.currentTime = 0;
        }
      }, 5000);

      window.addEventListener("beforeunload", () => {
        clearTimeout(alarmTimeoutId);
      });
    }
  }

  function setButtonState(button) {
    document
      .querySelectorAll("section#time-section div button")
      .forEach((btn) => {
        btn.classList.remove("pressed");
      });
    button.classList.add("pressed");
    pressedButton = button;
  }

  function updateBackground(timerType) {
    const color = backgroundColors[timerType];
    document.querySelector("html").style.backgroundColor = color;
    document.querySelector("#main").style.backgroundColor = color;
    document.querySelector("#startButton").style.color = color;
  }

  function updateDisplay(timer) {
    const formatTime = `${timer.minutes
      .toString()
      .padStart(2, "0")}:${timer.seconds.toString().padStart(2, "0")}`;
    stopwatch.textContent = formatTime;

    if (!timer.isRunning && timer.minutes === 0 && timer.seconds === 0) {
      stopwatch.textContent += " PAUSED";
    }

    startButton.textContent = timer.isRunning ? "Pause" : "Start";
    updateCycleCountDisplay(timer.cycleCountTracker);
    updateBackground(timer.currentState);
    setButtonState(document.getElementById(`${timer.currentState}Button`));

    if (timer.isRunning) {
      isTimerPaused = false;
      enableButtons(false);
    } else {
      isTimerPaused = true;
      enableButtons(true);
    }
    if (!alarmPlayed && timer.minutes === 0 && timer.seconds === 0) {
      playAlarmSound();
      console.log("instance", alarmInstance);
      console.log("boolean", alarmPlayed);
    }
  }

  function enableButtons(enabled) {
    const buttons = document.querySelectorAll("#time-section button");
    buttons.forEach((btn) => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? "1" : "0.5";
      btn.style.cursor = enabled ? "pointer" : "not-allowed";

      if (btn.classList.contains("pressed")) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    });
  }

  function updateCycleCountDisplay(count) {
    const displayElement = document.getElementById("cycleCountDisplay");
    if (displayElement) {
      displayElement.textContent = `#${count}`;
    }
  }

  startButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: startButton.textContent === "Start" ? "start" : "pause",
    });
  });

  pomodoroButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({action: "handleManualStart", type: "pomodoro"});
    updateBackground(backgroundColors.pomodoro);
    setButtonState(pomodoroButton);
  });

  shortBreakButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: "handleManualStart",
      type: "shortBreak",
    });
    updateBackground(backgroundColors.shortBreak);
    setButtonState(shortBreakButton);
  });

  longBreakButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: "handleManualStart",
      type: "longBreak",
    });
    updateBackground(backgroundColors.longBreak);
    setButtonState(longBreakButton);
  });

  document.body.addEventListener("keydown", function (event) {
    if (event.key === "r" || event.key === "R") {
      chrome.runtime.sendMessage({action: "reset"});
    }
  });

  function refreshPopupState() {
    chrome.runtime.sendMessage({action: "getState"}, function (response) {
      if (response) {
        updateDisplay(response);
        setButtonState(
          document.getElementById(`${response.currentState}Button`)
        );
      }
    });
  }
  refreshPopupState();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateTimer") {
      updateDisplay(request.timer);
    }
  });

  setInterval(refreshPopupState);

  enableButtons(false);
});
