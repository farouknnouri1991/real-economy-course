(function () {
  const form = document.getElementById("reader-feedback-form");
  if (!form) return;

  const STORAGE_KEY = "realEconomyReaderProfileV1";
  const article = document.getElementById("quarto-document-content") || document.querySelector("main");
  const status = document.getElementById("reader-feedback-status");
  const pageTitle = document.getElementById("feedback-page-title");
  const pageUrl = document.getElementById("feedback-page-url");
  const message = document.getElementById("feedback-message");
  const submitButton = form.querySelector('button[type="submit"]');
  const consent = document.getElementById("feedback-consent");
  const formTitle = document.getElementById("feedback-form-title");
  const closeButton = document.getElementById("feedback-close");
  const selectionEmpty = document.getElementById("feedback-selection-empty");
  const selectionContent = document.getElementById("feedback-selection-content");
  const selectionLocation = document.getElementById("feedback-selection-location");
  const selectionQuote = document.getElementById("feedback-selection-quote");
  const clearSelectionButton = document.getElementById("feedback-clear-selection");
  const profileFields = document.getElementById("feedback-profile-fields");
  const profileSummary = document.getElementById("feedback-profile-summary");
  const profileName = document.getElementById("feedback-profile-name");
  const profileMeta = document.getElementById("feedback-profile-meta");
  const profileChange = document.getElementById("feedback-profile-change");
  const profileForget = document.getElementById("feedback-profile-forget");
  const rememberProfile = document.getElementById("feedback-remember");
  const profileInputs = {
    firstName: document.getElementById("feedback-first-name"),
    lastName: document.getElementById("feedback-last-name"),
    category: document.getElementById("feedback-category"),
    email: document.getElementById("feedback-email")
  };
  const selectionFields = {
    sectionTitle: document.getElementById("feedback-section-title"),
    sectionId: document.getElementById("feedback-section-id"),
    selectedText: document.getElementById("feedback-selected-text"),
    prefix: document.getElementById("feedback-selection-prefix"),
    suffix: document.getElementById("feedback-selection-suffix"),
    start: document.getElementById("feedback-selection-start"),
    end: document.getElementById("feedback-selection-end")
  };

  let storedProfile = null;
  let selectionTimer = null;

  pageTitle.value = document.querySelector("h1")?.textContent?.trim() || document.title;
  pageUrl.value = window.location.href.split("#")[0];

  function readStoredProfile() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (!parsed || !parsed.firstName || !parsed.lastName || !parsed.category || !parsed.email) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeStoredProfile(profile) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeStoredProfile() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // The visible form remains usable even if browser storage is unavailable.
    }
  }

  function maskEmail(email) {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const local = parts[0];
    const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
    return `${visible}…@${parts[1]}`;
  }

  function currentProfile() {
    return {
      firstName: profileInputs.firstName.value.trim(),
      lastName: profileInputs.lastName.value.trim(),
      category: profileInputs.category.value,
      email: profileInputs.email.value.trim()
    };
  }

  function fillProfile(profile) {
    profileInputs.firstName.value = profile.firstName;
    profileInputs.lastName.value = profile.lastName;
    profileInputs.category.value = profile.category;
    profileInputs.email.value = profile.email;
  }

  function showStoredProfile(profile) {
    storedProfile = profile;
    fillProfile(profile);
    profileName.textContent = `${profile.firstName} ${profile.lastName}`;
    profileMeta.textContent = ` · ${profile.category} · ${maskEmail(profile.email)}`;
    profileFields.hidden = true;
    profileSummary.hidden = false;
  }

  function showProfileFields(clear) {
    profileSummary.hidden = true;
    profileFields.hidden = false;
    if (clear) {
      form.querySelectorAll("#feedback-profile-fields input, #feedback-profile-fields select").forEach(function (field) {
        if (field.type === "checkbox") field.checked = false;
        else field.value = "";
      });
    }
  }

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

  function positionPopover(rect) {
    form.classList.add("reader-feedback__form--popover");
    const width = Math.min(430, window.innerWidth - 24);
    form.style.width = `${width}px`;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
    form.style.left = `${left}px`;
    window.requestAnimationFrame(function () {
      const visibleHeight = Math.min(form.scrollHeight, window.innerHeight * 0.82);
      const maximumTop = Math.max(12, window.innerHeight - visibleHeight - 12);
      const top = Math.max(12, Math.min(rect.bottom + 12, maximumTop));
      form.style.top = `${top}px`;
    });
    closeButton.hidden = false;
    formTitle.textContent = "Comment on this passage";
  }

  function leavePopover() {
    form.classList.remove("reader-feedback__form--popover");
    form.style.removeProperty("left");
    form.style.removeProperty("top");
    form.style.removeProperty("width");
    closeButton.hidden = true;
    formTitle.textContent = "Comment on this page";
  }

  function clearSelection(exitPopover) {
    Object.values(selectionFields).forEach(function (field) { field.value = ""; });
    selectionQuote.textContent = "";
    selectionLocation.textContent = "";
    selectionContent.hidden = true;
    selectionEmpty.hidden = false;
    if (exitPopover) leavePopover();
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
    positionPopover(selection.rect);
    window.setTimeout(function () { message.focus({ preventScroll: true }); }, 120);
  }

  function offerInlineComment() {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(function () {
      const captured = captureSelection();
      if (captured) attachSelection(captured);
    }, 20);
  }

  article?.addEventListener("mouseup", offerInlineComment);
  article?.addEventListener("keyup", offerInlineComment);

  clearSelectionButton.addEventListener("click", function () {
    clearSelection(true);
  });

  closeButton.addEventListener("click", function () {
    clearSelection(true);
    message.value = "";
    status.textContent = "";
  });

  profileChange.addEventListener("click", function () {
    showProfileFields(false);
    rememberProfile.checked = true;
    profileInputs.firstName.focus();
  });

  profileForget.addEventListener("click", function () {
    removeStoredProfile();
    storedProfile = null;
    showProfileFields(true);
    profileInputs.firstName.focus();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const profile = currentProfile();
    if (!profileFields.hidden && rememberProfile.checked) {
      if (writeStoredProfile(profile)) showStoredProfile(profile);
    }

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

      message.value = "";
      consent.checked = false;
      clearSelection(true);
      pageTitle.value = document.querySelector("h1")?.textContent?.trim() || document.title;
      pageUrl.value = window.location.href.split("#")[0];
      if (storedProfile) showStoredProfile(storedProfile);
      status.textContent = "Thank you. Your comment has been sent for private review.";
      status.className = "reader-feedback__status reader-feedback__status--success";
    } catch (error) {
      status.textContent = "Your comment could not be sent. Please try again later.";
      status.className = "reader-feedback__status reader-feedback__status--error";
    } finally {
      submitButton.disabled = false;
    }
  });

  storedProfile = readStoredProfile();
  if (storedProfile) showStoredProfile(storedProfile);
})();
