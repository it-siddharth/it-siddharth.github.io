const photoDialog = document.querySelector(".article-photo-dialog");
const photoDialogFrame = photoDialog?.querySelector(".article-photo-crop");
const photoDialogImage = photoDialogFrame?.querySelector("img");
const photoDialogShade = photoDialog?.querySelector(".article-photo-shade");
const photoDialogClose = photoDialog?.querySelector(".article-photo-dialog-close");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (
  photoDialog &&
  photoDialogFrame &&
  photoDialogImage &&
  photoDialogShade &&
  photoDialogClose
) {
  let activeLink = null;
  let isAnimating = false;
  let closeRequested = false;

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  // A rotated or perspective-transformed card has a wider bounding box than
  // the print itself. Animate its actual dimensions so it never stretches.
  function photoRect(frame) {
    const bounds = frame.getBoundingClientRect();
    const width = frame.offsetWidth || bounds.width;
    const height = frame.offsetHeight || bounds.height;
    const left = bounds.left + (bounds.width - width) / 2;
    const top = bounds.top + (bounds.height - height) / 2;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  function createFlyingPhoto(frame, from) {
    const flyingFrame = frame.cloneNode(true);
    flyingFrame.setAttribute("aria-hidden", "true");
    flyingFrame.querySelector("img")?.setAttribute("alt", "");
    flyingFrame.classList.add("article-photo-flying");
    Object.assign(flyingFrame.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      opacity: "1",
    });
    photoDialog.append(flyingFrame);
    return flyingFrame;
  }

  async function flyPhoto(flyingFrame, from, to) {
    if (reducedMotion.matches || !from.width || !to.width) return;

    const motion = flyingFrame.animate(
      [
        { transform: "translate3d(0, 0, 0) scale(1, 1)" },
        {
          transform: `translate3d(${to.left - from.left}px, ${to.top - from.top}px, 0) scale(${to.width / from.width}, ${to.height / from.height})`,
        },
      ],
      { duration: 560, easing: "cubic-bezier(.2, .72, .22, 1)", fill: "forwards" },
    );

    await motion.finished.catch(() => {});
  }

  function isVisible(rect) {
    return rect && rect.width > 0 && rect.height > 0 &&
      rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
  }

  function fadeShade(from, to) {
    photoDialogShade.style.opacity = String(from);
    if (reducedMotion.matches) {
      photoDialogShade.style.opacity = String(to);
      return Promise.resolve();
    }
    const fade = photoDialogShade.animate(
      [{ opacity: from }, { opacity: to }],
      { duration: 420, easing: "ease-in-out" },
    );
    return fade.finished.catch(() => {}).then(() => {
      photoDialogShade.style.opacity = String(to);
    });
  }

  async function openPhoto(link) {
    if (isAnimating || photoDialog.open) return;
    const preview = link.querySelector("img");
    const crop = link.querySelector(".article-photo-crop");
    if (!preview || !crop) return;

    isAnimating = true;
    activeLink = link;
    document.body.classList.add("article-photo-viewing");
    const from = photoRect(crop);
    photoDialogFrame.classList.toggle(
      "article-photo-crop--landscape",
      crop?.classList.contains("article-photo-crop--landscape") ?? false,
    );
    photoDialogFrame.classList.toggle(
      "article-photo-crop--portraitized",
      crop?.classList.contains("article-photo-crop--portraitized") ?? false,
    );
    photoDialogImage.alt = preview.alt || "Article photo";
    photoDialogImage.src = link.href;
    photoDialogFrame.style.opacity = "0";
    photoDialogClose.style.opacity = "0";
    photoDialogShade.style.opacity = "0";
    photoDialog.showModal();
    const flyingFrame = createFlyingPhoto(crop, from);
    crop.style.visibility = "hidden";

    try {
      // The card starts moving immediately; its clone holds the final frame
      // until the full image has finished decoding behind it.
      const decoded = photoDialogImage.decode().catch(() => {});
      await nextFrame();
      await Promise.all([
        flyPhoto(flyingFrame, from, photoRect(photoDialogFrame)),
        fadeShade(0, 1),
        decoded,
      ]);
      photoDialogFrame.style.opacity = "1";
      photoDialogClose.style.opacity = "1";
      photoDialogClose.focus({ preventScroll: true });
    } finally {
      flyingFrame.remove();
      isAnimating = false;
      if (closeRequested) {
        closeRequested = false;
        void closePhoto();
      }
    }
  }

  async function closePhoto() {
    if (isAnimating) {
      closeRequested = true;
      return;
    }
    if (!photoDialog.open) return;
    isAnimating = true;
    const preview = activeLink?.querySelector(".article-photo-crop");
    const from = photoRect(photoDialogFrame);
    const to = preview && photoRect(preview);
    const flyingFrame = createFlyingPhoto(photoDialogFrame, from);
    photoDialogFrame.style.opacity = "0";
    photoDialogClose.style.opacity = "0";

    try {
      const photoMotion = isVisible(to)
        ? flyPhoto(flyingFrame, from, to)
        : reducedMotion.matches
          ? Promise.resolve()
          : flyingFrame.animate(
              [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.94)" }],
              { duration: 260, easing: "ease-in-out" },
            ).finished.catch(() => {});
      await Promise.all([photoMotion, fadeShade(1, 0)]);
    } finally {
      flyingFrame.remove();
      photoDialog.close();
      if (preview) preview.style.visibility = "";
      document.body.classList.remove("article-photo-viewing");
      activeLink?.focus({ preventScroll: true });
      activeLink = null;
      isAnimating = false;
    }
  }

  document.querySelectorAll(".article-photo-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      void openPhoto(link);
    });
  });

  photoDialogClose.addEventListener("click", () => void closePhoto());
  photoDialogShade.addEventListener("click", () => void closePhoto());
  photoDialog.addEventListener("click", (event) => {
    if (event.target === photoDialog) void closePhoto();
  });
  photoDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    void closePhoto();
  });
  photoDialog.addEventListener("close", () => {
    photoDialogImage.removeAttribute("src");
  });
}
