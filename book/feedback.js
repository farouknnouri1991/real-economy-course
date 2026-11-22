(function () {
  const form = document.getElementById("reader-feedback-form");
  if (!form) return;

  const status = document.getElementById("reader-feedback-status");
  const pageTitle = document.getElementById("feedback-page-title");
  const pageUrl = document.getElementById("feedback-page-url");
  const submitButton = form.querySelector('button[type="submit"]');

  pageTitle.value = document.querySelector("h1")?.textContent?.trim() || document.title;
  pageUrl.value = window.location.href.split("#")[0];

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    submitButton.disabled = true;
    status.textContent = "Sending your comment…";
    status.className = "reader-feedback__status";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (!response.ok) throw new Error("Submission failed");

      form.reset();
      pageTitle.value = document.querySelector("h1")?.textContent?.trim() || document.title;
      pageUrl.value = window.location.href.split("#")[0];
      status.textContent = "Thank you. Your comment has been sent for private review.";
      status.className = "reader-feedback__status reader-feedback__status--success";
    } catch (error) {
      status.textContent = "Your comment could not be sent. Please try again later.";
      status.className = "reader-feedback__status reader-feedback__status--error";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
