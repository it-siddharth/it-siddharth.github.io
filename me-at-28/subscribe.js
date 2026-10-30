const subscribeForm = document.getElementById("article-subscribe");
const subscribeFeedback = document.getElementById("article-subscribe-feedback");

subscribeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = subscribeForm.querySelector('button[type="submit"]');
  const email = subscribeForm.elements.email.value.trim();
  if (!email || !button) return;

  button.disabled = true;
  subscribeFeedback.textContent = "SUBSCRIBING…";
  try {
    const response = await fetch(
      "https://app.loops.so/api/newsletter-form/clqjvz3fs02tcitbz2bj92s14",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, userGroup: "signup" }),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Something went wrong. Please try again.");
    }
    subscribeForm.reset();
    subscribeFeedback.textContent = "YOU'RE IN THE LOOP. CHECK YOUR INBOX.";
  } catch (error) {
    subscribeFeedback.textContent =
      error instanceof Error ? error.message : "Something went wrong. Please try again.";
  } finally {
    button.disabled = false;
  }
});
