document.querySelectorAll(".article-friends-carousel").forEach((carousel) => {
  const stage = carousel.querySelector(".article-photo-carousel-stage");
  const photos = [...carousel.querySelectorAll(".article-photo-carousel-ring .article-photo-link")];
  const previous = carousel.querySelector(".article-photo-carousel-prev");
  const next = carousel.querySelector(".article-photo-carousel-next");
  const count = carousel.querySelector(".article-photo-carousel-count");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let progress = 1;
  let manualShift = 0;
  let manualTarget = 0;
  let manualVelocity = 0;
  let pointerStart = null;
  let suppressClick = false;
  let lastFrame = null;
  let step = 0;
  let currentIndex = -1;
  const interactiveStates = Array(photos.length).fill(null);

  function wrap(value, length) {
    return ((value % length) + length) % length;
  }

  function measure() {
    const width = parseFloat(getComputedStyle(carousel).getPropertyValue("--carousel-card-width"));
    step = width + (width < 160 ? 8 : 10);
  }

  function render() {
    const center = progress + manualShift;
    const current = wrap(Math.round(center), photos.length);
    if (current !== currentIndex) {
      if (currentIndex >= 0) photos[currentIndex].removeAttribute("aria-current");
      photos[current].setAttribute("aria-current", "true");
      count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
      currentIndex = current;
    }

    photos.forEach((photo, index) => {
      const slot = wrap(index - center + photos.length / 2, photos.length) - photos.length / 2;
      const distance = Math.abs(slot);
      photo.style.transform = `translate3d(calc(-50% + ${slot * step}px), -50%, ${-distance * 24}px) rotateY(${-slot * 7}deg)`;
      photo.style.opacity = String(Math.max(0, Math.min(1, 3 - distance)));
      photo.style.zIndex = String(Math.round(100 - distance * 10));
      const interactive = distance <= 2.5;
      if (interactiveStates[index] !== interactive) {
        photo.style.pointerEvents = interactive ? "auto" : "none";
        photo.tabIndex = interactive ? 0 : -1;
        interactiveStates[index] = interactive;
      }
    });
  }

  function move(direction) {
    manualTarget += direction;
  }

  function animate(time) {
    const elapsed = lastFrame === null ? 0 : Math.min(time - lastFrame, 50);
    lastFrame = time;
    const paused = document.hidden || document.body.classList.contains("article-photo-viewing");
    if (!paused) {
      if (!reduceMotion.matches) {
        progress = wrap(progress + elapsed * 0.00018, photos.length);
      }
      if (reduceMotion.matches) {
        manualShift = manualTarget;
        manualVelocity = 0;
      } else if (Math.abs(manualTarget - manualShift) > 0.001 || Math.abs(manualVelocity) > 0.001) {
        const seconds = elapsed / 1000;
        manualVelocity += (160 * (manualTarget - manualShift) - 26 * manualVelocity) * seconds;
        manualShift += manualVelocity * seconds;
        if (Math.abs(manualTarget - manualShift) < 0.001 && Math.abs(manualVelocity) < 0.002) {
          manualShift = manualTarget;
          manualVelocity = 0;
        }
      }
    }
    render();
    requestAnimationFrame(animate);
  }

  photos.forEach((photo) => photo.querySelector("img")?.setAttribute("draggable", "false"));
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart = { id: event.pointerId, x: event.clientX };
  });
  window.addEventListener("pointerup", (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const distance = event.clientX - pointerStart.x;
    pointerStart = null;
    if (Math.abs(distance) < 45) return;
    suppressClick = true;
    move(distance < 0 ? 1 : -1);
    setTimeout(() => { suppressClick = false; }, 0);
  });
  window.addEventListener("pointercancel", () => { pointerStart = null; });
  stage.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener("resize", () => { measure(); render(); });
  measure();
  render();
  requestAnimationFrame(animate);
});
