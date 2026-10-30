(() => {
  const player = document.querySelector(".audio-player");
  const article = document.querySelector(".article-content");
  if (!player || !article) return;

  const playButton = player.querySelector(".audio-play-btn");
  const stopButton = player.querySelector(".audio-stop-btn");
  const progress = player.querySelector(".audio-progress-fill");
  const time = player.querySelector(".audio-time");
  const status = player.querySelector(".audio-status");
  const synth = window.speechSynthesis;

  if (!synth || !window.SpeechSynthesisUtterance) {
    playButton.disabled = true;
    playButton.setAttribute("aria-label", "Audio unavailable in this browser");
    status.textContent = "Browser speech playback is unavailable.";
    return;
  }

  const text = [...article.querySelectorAll("p, li")]
    .map((element) => element.textContent.trim())
    .filter(Boolean)
    .join(" ");
  const sentences = text.match(/[^.!?]+[.!?]+[\s”"']*/g) || [text];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    for (const word of words) {
      if ((current + " " + word).length > 200 && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += `${current ? " " : ""}${word}`;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const duration = Math.ceil((text.split(/\s+/).length / 150) * 60);
  let chunkIndex = 0;
  let completedChars = 0;
  let boundaryChar = 0;
  let state = "stopped";
  let startTime = 0;
  let elapsedBeforePause = 0;
  let timer = 0;

  const formatTime = (seconds) => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };

  const render = () => {
    const elapsed = state === "playing"
      ? elapsedBeforePause + (performance.now() - startTime) / 1000
      : elapsedBeforePause;
    const fraction = totalChars
      ? Math.min(1, (completedChars + boundaryChar) / totalChars)
      : 0;
    progress.style.width = `${fraction * 100}%`;
    time.textContent = `${formatTime(Math.min(elapsed, duration))} / ${formatTime(duration)}`;
    playButton.textContent = state === "playing" ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Play");
    stopButton.hidden = state === "stopped" && elapsedBeforePause === 0;
    status.textContent = state === "playing" ? "Playing article" : state === "paused" ? "Article paused" : "Article stopped";
  };

  const startTimer = () => {
    clearInterval(timer);
    timer = window.setInterval(render, 250);
  };

  const stop = () => {
    state = "stopped";
    synth.cancel();
    clearInterval(timer);
    chunkIndex = 0;
    completedChars = 0;
    boundaryChar = 0;
    elapsedBeforePause = 0;
    render();
  };

  const speakNext = () => {
    if (state !== "playing") return;
    if (chunkIndex >= chunks.length) {
      state = "stopped";
      clearInterval(timer);
      completedChars = totalChars;
      boundaryChar = 0;
      elapsedBeforePause = duration;
      render();
      status.textContent = "Article finished";
      return;
    }

    const chunk = chunks[chunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = "en-US";
    utterance.rate = 1;
    const localEnglishVoice = synth.getVoices().find((voice) =>
      voice.lang.startsWith("en") && voice.localService
    );
    if (localEnglishVoice) utterance.voice = localEnglishVoice;
    utterance.onboundary = (event) => {
      boundaryChar = event.charIndex;
      render();
    };
    utterance.onend = () => {
      if (state === "stopped") return;
      completedChars += chunk.length;
      boundaryChar = 0;
      chunkIndex += 1;
      speakNext();
    };
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      stop();
      status.textContent = "Audio playback failed. Try again.";
    };
    synth.speak(utterance);
  };

  playButton.addEventListener("click", () => {
    if (state === "playing") {
      synth.pause();
      elapsedBeforePause += (performance.now() - startTime) / 1000;
      state = "paused";
      clearInterval(timer);
      render();
      return;
    }
    if (state === "paused") {
      synth.resume();
      startTime = performance.now();
      state = "playing";
      startTimer();
      render();
      return;
    }
    synth.cancel();
    chunkIndex = 0;
    completedChars = 0;
    boundaryChar = 0;
    elapsedBeforePause = 0;
    startTime = performance.now();
    state = "playing";
    startTimer();
    speakNext();
    render();
  });

  stopButton.addEventListener("click", stop);
  window.addEventListener("pagehide", () => synth.cancel());
  render();
})();
