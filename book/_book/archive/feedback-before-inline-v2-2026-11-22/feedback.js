(function () {
  const form = document.getElementById("reader-feedback-form");
  if (!form) return;

  const article = document.getElementById("quarto-document-content") || document.querySelector("main");
  const status = document.getElementById("reader-feedback-status");
  const pageTitle = document.getElementById("feedback-page-title");
  const pageUrl = document.getElementById("feedback-page-url");
  const message = document.getElementById("feedback-message");
  const submitButton = form.querySelector('button[type="submit"]');
  const selectionEmpty = document.getElementById("feedback-selection-empty");
  const selectionContent = document.getElementById("feedback-selection-content");
  const selectionLocation = document.getElementById("feedback-selection-location");
  const selectionQuote = document.getElementById("feedback-selection-quote");
  const clearSelectionButton = document.getElementById("feedback-clear-selection");
  const selectionFields = {
    sectionTitle: document.getElementById("feedback-section-title"),
    sectionId: document.getElementById("feedback-section-id"),
    selectedText: document.getElementById("feedback-selected-text"),
    prefix: document.getElementById("feedback-selection-prefix"),
    suffix: document.getElementById("feedback-selection-suffix"),
    start: document.getElementById("feedback-selection-start"),
    end: document.getElementById("feedback-selection-end")
  };
  const passageButton = document.createElement("button");
  let pendingSelection = null;

  passageButton.type = "button";
  passageButton.className = "reader-feedback__passage-button";
  passageButton.textContent = "Comment on this passage";
  passageButton.hidden = true;
  document.body.appendChild(passageButton);

  pageTitle.value = document.querySelector("h1")?.textContent?.trim() || document.title;
  pageUrl.value = window.location.href.split("#")[0];

  function closestSection(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest("section[id]") || element?.closest("div[id]") || article;
  }

  function sectionHeading(section) {
    if (!section) return pageTitle.value;
    const heading = section.querySelector(":scope > h2, :scope > h3, :scope > h4, h2, h3, h4");
    return heading?.textContent?.replace(/Anchor$/i, "")?.trim() || pageTitle.value;
  }

  function textOffset(container, node, offset) {
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return range.toString().length;
  }

  function captureSelection() {
    if (!article) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer) || form.contains(range.commonAncestorContainer)) return null;
    const exact = selection.toString().replace(/\s+/g, " ").trim();
    if (exact.length < 2) return null;
    const section = closestSection(range.startContainer);
    const container = section || article;
    const fullText = container.textContent || "";
    const start = textOffset(container, range.startContainer, range.startOffset);
    const end = textOffset(container, range.endContainer, range.endOffset);
    return {
      exact: exact.slice(0, 2000),
      sectionId: container.id || "",
      sectionTitle: sectionHeading(container),
      prefix: fullText.slice(Math.max(0, start - 160), start).replace(/\s+/g, " ").trim(),
      suffix: fullText.slice(end, end + 160).replace(/\s+/g, " ").trim(),
      start,
      end,
      rect: range.getBoundingClientRect()
    };
  }

  function positionPassageButton(rect) {
    const left = Math.min(window.innerWidth - 220, Math.max(12, rect.left + rect.width / 2 - 95));
    const top = Math.max(12, rect.bottom + window.scrollY + 8);
    passageButton.style.left = `${left}px`;
    passageButton.style.top = `${top}px`;
    passageButton.hidden = false;
  }

  function offerSelection() {
    window.setTimeout(function () {
      const captured = captureSelection();
      if (!captured) {
        passageButton.hidden = true;
        pendingSelection = null;
        return;
      }
      pendingSelection = captured;
      positionPassageButton(captured.rect);
    }, 0);
  }

  function clearSelection() {
    Object.values(selectionFields).forEach(function (field) { field.value = ""; });
    selectionQuote.textContent = "";
    selectionLocation.textContent = "";
    selectionContent.hidden = true;
    selectionEmpty.hidden = false;
  }

  function attachSelection(selection) {
    selectionFields.sectionTitle.value = selection.sectionTitle;
    selectionFields.sectionId.value = selection.sectionId;
    selectionFields.selectedText.value = selection.exact;
    selectionFields.prefix.value = selection.prefix;
    selectionFields.suffix.value = selection.suffix;
    selectionFields.start.value = String(selection.start);
    selectionFields.end.value = String(selection.end);
    selectionLocation.textContent = selection.sectionTitle;
    selectionQuote.textContent = `“${selection.exact}”`;
    selectionEmpty.hidden = true;
    selectionContent.hidden = false;
    passageButton.hidden = true;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(function () { message.focus({ preventScroll: true }); }, 450);
  }

  article?.addEventListener("mouseup", offerSelection);
  article?.addEventListener("keyup", offerSelection);
  document.addEventListener("selectionchange", function () {
    if (window.getSelection()?.isCollapsed) passageButton.hidden = true;
  });
  passageButton.addEventListener("mousedown", function (event) { event.preventDefault(); });
  passageButton.addEventListener("click", function () {
    if (pendingSelection) attachSelection(pendingSelection);
  });
  clearSelectionButton.addEventListener("click", clearSelection);

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
      clearSelection();
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
