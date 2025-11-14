const scriptEl = document.getElementById("convex-reviews-script");
const reviewForm = document.getElementById("review-form");
const reviewsContainer = document.getElementById("reviews-list-container");
const placeholder = document.getElementById("reviews-placeholder");
const submitButton = document.getElementById("review-submit-button");
const formStatus = document.getElementById("form-status");
const yearEl = document.getElementById("year");
const metaConvexUrl = document.querySelector('meta[name="convex-url"]');
const themeToggle = document.getElementById("theme-toggle");
const themeToggleIcon = themeToggle?.querySelector(".theme-toggle-icon");
const themeToggleLabel = themeToggle?.querySelector(".theme-toggle-label");
const THEME_STORAGE_KEY = "theme";

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const CONVEX_URL = "https://savory-beagle-529.convex.cloud";
  const client = new convex.ConvexClient(CONVEX_URL);

if (CONVEX_URL) {
  await hydrateReviews(client);
  subscribeToReviews(client);
} else {
  showMissingConfigMessage();
}

initializeThemeToggle();

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!client) {
    setStatus("Convex backend not configured. Unable to submit.", "error");
    return;
  }

  const formData = new FormData(reviewForm);
  const name = String(formData.get("name") || "").trim();
  const comment = String(formData.get("comment") || "").trim();
  const rating = parseInt(String(formData.get("rating") || "0"), 10);

  if (!name || !comment || !rating) {
    setStatus("Please fill out all fields.", "error");
    return;
  }
  if (name.length < 2 || comment.length < 10) {
    setStatus("Name or message is too short.", "error");
    return;
  }

  setSubmitting(true);
  setStatus("Submitting...", "success");

  try {
    await client.mutation("reviews:createReview", {
      name,
      comment,
      rating,
    });

    reviewForm.reset();
    setStatus("Thank you for your review!", "success");
    setSubmitting(false);

    setTimeout(() => setStatus("", ""), 3000);
  } catch (error) {
    console.error("Failed to submit review:", error);
    setStatus("Submission failed. Please try again.", "error");
    setSubmitting(false);
  }
});

function subscribeToReviews(convexClient) {
  convexClient.onUpdate("reviews:getReviews", {}, renderReviews, handleReviewError);
}

async function hydrateReviews(convexClient) {
  try {
    const initialReviews = await convexClient.query("reviews:getReviews", {});
    renderReviews(initialReviews);
  } catch (error) {
    handleReviewError(error);
  }
}

function renderReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    reviewsContainer.innerHTML = "";
    placeholder.innerHTML = "<p>Be the first to leave a review!</p>";
    reviewsContainer.appendChild(placeholder);
    return;
  }

  const reviewsHtml = reviews
    .map((review) => {
      const stars = "★★★★★".slice(0, review.rating) + "☆☆☆☆☆".slice(review.rating);
      const safeName = review.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeComment = review.comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      return `
      <article class="review-card">
        <header class="review-header">
          <span>${safeName}</span>
          ${review.rating ? `<span class="rating">${stars}</span>` : ""}
        </header>
        <p class="review-body">${safeComment}</p>
      </article>
    `;
    })
    .join("");

  reviewsContainer.innerHTML = reviewsHtml;
}

function handleReviewError(error) {
  console.error("Failed to load reviews:", error);
  placeholder.innerHTML = "<p>Could not load reviews. Check console for details.</p>";
}

function showMissingConfigMessage() {
  console.warn(
    "Convex URL not set. Provide it via .env.local, data-convex-url, meta[name=\"convex-url\"], or window.CONVEX_URL."
  );
  if (placeholder) {
    placeholder.innerHTML = "<p>Error: Convex client not configured.</p>";
  }
  setStatus("Convex backend not configured.", "error");
  setSubmitting(true);
}

function setStatus(message, type) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = message
    ? `status ${type === "error" ? "status--error" : "status--success"}`
    : "status";
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;
  if (isSubmitting) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  } else {
    submitButton.disabled = false;
    submitButton.textContent = "Send Review";
  }
}

function initializeThemeToggle() {
  if (!themeToggle) return;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    if (themeToggle) {
      const isDark = theme === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      if (themeToggleIcon) {
        themeToggleIcon.textContent = isDark ? "🌙" : "☀️";
      }
      if (themeToggleLabel) {
        themeToggleLabel.textContent = isDark ? "Dark mode" : "Light mode";
      }
    }
  };

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = storedTheme || document.documentElement.dataset.theme || (media.matches ? "dark" : "light");
  applyTheme(initialTheme);

  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
  });

  media.addEventListener("change", (event) => {
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    applyTheme(event.matches ? "dark" : "light");
  });
}

async function resolveConvexUrl() {
  const attrUrl = scriptEl?.dataset?.convexUrl ?? "";
  const metaUrl = metaConvexUrl?.getAttribute("content") ?? "";
  const globalUrl =
    typeof window !== "undefined"
      ? window.CONVEX_URL ??
        window.process?.env?.CONVEX_URL ??
        window.localStorage?.getItem("CONVEX_URL") ??
        ""
      : "";

  const inlineValue = [globalUrl, attrUrl, metaUrl].find(
    (value) => value && value !== "YOUR_CONVEX_URL_HERE"
  );
  if (inlineValue) return inlineValue;

  try {
    const response = await fetch(".env.local", { cache: "no-store" });
    if (response.ok) {
      const envText = await response.text();
      const match = envText.match(/^\s*CONVEX_URL\s*=\s*(.+)\s*$/m);
      if (match && match[1]) {
        return match[1].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // Ignore errors when .env.local is not publicly served.
  }

  return "";
}
