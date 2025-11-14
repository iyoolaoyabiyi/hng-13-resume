const scriptEl = document.getElementById("convex-reviews-script");
const reviewForm = document.getElementById("review-form");
const reviewsContainer = document.getElementById("reviews-list-container");
const placeholder = document.getElementById("reviews-placeholder");
const submitButton = document.getElementById("review-submit-button");
const formStatus = document.getElementById("form-status");
const metaConvexUrl = document.querySelector('meta[name="convex-url"]');
const themeToggle = document.getElementById("theme-toggle");
const themeToggleIcon = themeToggle?.querySelector(".theme-toggle-icon");
const themeToggleLabel = themeToggle?.querySelector(".theme-toggle-label");
const navToggle = document.getElementById("nav-toggle");
const siteHeader = document.querySelector(".site-header");
const navList = document.getElementById("primary-navigation-list");
const brandInitialsEl = document.getElementById("brand-initials");
const brandNameEl = document.getElementById("brand-name");
const brandTaglineEl = document.getElementById("brand-tagline");
const heroMain = document.getElementById("hero-main");
const skillsPanel = document.getElementById("skills-panel");
const projectsHeadingEl = document.getElementById("projects-heading");
const projectsGrid = document.getElementById("projects-grid");
const processSection = document.getElementById("process");
const reviewsHeadingEl = document.getElementById("reviews-heading");
const reviewFormTitleEl = document.getElementById("review-form-title");
const reviewFormHelperEl = document.getElementById("review-form-helper");
const footerTextEl = document.getElementById("footer-text");
const backToTopLink = document.getElementById("back-to-top-link");
const CONTENT_PATH = "./content.json";
const DEFAULT_CONVEX_URL = "https://savory-beagle-529.convex.cloud";
const THEME_STORAGE_KEY = "theme";
let submitButtonDefaultText = submitButton?.textContent?.trim() || "Send Review";
let client = null;

const contentPromise = loadAndRenderSiteContent();
const reviewSetupPromise = setupReviews();

await contentPromise;
initializeNavToggle();
initializeThemeToggle();
updateYear();

await reviewSetupPromise;

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

async function setupReviews() {
  try {
    if (typeof convex === "undefined") {
      console.warn("Convex client not available on window.");
      showMissingConfigMessage();
      return;
    }

    const resolvedUrl = await resolveConvexUrl();
    const urlToUse = resolvedUrl || DEFAULT_CONVEX_URL;
    if (!urlToUse) {
      showMissingConfigMessage();
      return;
    }

    client = new convex.ConvexClient(urlToUse);
    await hydrateReviews(client);
    subscribeToReviews(client);
  } catch (error) {
    console.error("Failed to initialize reviews:", error);
    showMissingConfigMessage();
  }
}

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
    submitButton.textContent = submitButtonDefaultText;
  }
}

async function loadAndRenderSiteContent() {
  try {
    const response = await fetch(CONTENT_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load content: ${response.status} ${response.statusText}`);
    }
    const content = await response.json();
    applySiteContent(content);
  } catch (error) {
    console.error("Failed to load site content:", error);
  }
}

function applySiteContent(content) {
  if (!content) return;
  updateSiteMeta(content.site);
  renderBrand(content.site?.brand);
  renderNavigation(content.navigation);
  renderHero(content.hero);
  renderSkills(content.skills);
  renderProjects(content.projects);
  renderProcess(content.process);
  renderReviewsSection(content.reviewsSection);
  renderFooter(content.footer);
}

function renderBrand(brand) {
  if (!brand) return;
  if (brandInitialsEl) {
    brandInitialsEl.textContent = brand.initials || "";
  }
  if (brandNameEl) {
    brandNameEl.textContent = brand.name || "";
  }
  if (brandTaglineEl) {
    brandTaglineEl.textContent = brand.tagline || "";
  }
}

function renderNavigation(items = []) {
  if (!navList) return;
  navList.innerHTML = items
    .map((item) => {
      const variantClass = item.variant === "cta" ? " nav-link--cta" : "";
      const icon = item.icon ? ` <span aria-hidden="true">${item.icon}</span>` : "";
      return `<li><a class="nav-link${variantClass}" href="${item.href || "#"}">${item.label || ""}${icon}</a></li>`;
    })
    .join("");
}

function renderHero(hero) {
  if (!heroMain || !hero) return;
  const actions = (hero.actions || [])
    .map((action) => {
      const variantClass = action.variant === "ghost" ? "btn-ghost" : "btn-primary";
      return `<a class="${variantClass}" href="${action.href || "#"}">${action.label || ""}</a>`;
    })
    .join("");
  const meta = (hero.meta || [])
    .map(
      (item) => `
      <div class="hero-meta-item">
        <dt class="hero-meta-label">${item.label || ""}</dt>
        <dd class="hero-meta-value">${item.value || ""}</dd>
      </div>
    `
    )
    .join("");

  heroMain.innerHTML = `
    <div class="eyebrow">
      <span class="eyebrow-pill" aria-hidden="true">●</span>
      ${hero.eyebrow || ""}
    </div>
    <h1 id="hero-title">${hero.title || ""}</h1>
    <p class="hero-lead">${hero.lead || ""}</p>
    ${actions ? `<div class="hero-actions">${actions}</div>` : ""}
    ${
      meta
        ? `<dl class="hero-meta" aria-label="Key strengths">
            ${meta}
          </dl>`
        : ""
    }
  `;
}

function renderSkills(skills) {
  if (!skillsPanel || !skills) return;
  const chips = (skills.items || [])
    .map(
      (item) =>
        `<div class="skill-chip"><span class="skill-label">${item.label || ""}</span><span class="skill-strength">${item.strength || ""}</span></div>`
    )
    .join("");

  skillsPanel.innerHTML = `
    <div class="panel-heading">
      <h2 id="skills">${skills.heading || ""}</h2>
      ${skills.tag ? `<span class="panel-tag">${skills.tag}</span>` : ""}
    </div>
    <div class="skills-grid">${chips}</div>
  `;
}

function renderProjects(projects) {
  if (!projectsGrid || !projects) return;
  if (projectsHeadingEl) {
    projectsHeadingEl.textContent = projects.heading || "";
  }
  projectsGrid.innerHTML = (projects.items || [])
    .map(
      (project) => `
      <article class="bento-item">
        <header>
          <p class="project-kicker">${project.kicker || ""}</p>
          <h3 class="project-title">${project.title || ""}</h3>
          ${
            project.tags?.length
              ? `<p class="project-meta">
                ${project.tags.map((tag) => `<span class="project-tag">${tag}</span>`).join("")}
              </p>`
              : ""
          }
        </header>
        <p class="project-description">
          ${project.description || ""}
        </p>
        ${
          project.bullets?.length
            ? `<ul class="project-list">
              ${project.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
            </ul>`
            : ""
        }
        ${
          project.score
            ? `<footer class="project-footer">
              <span class="project-score">Score: ${project.score}</span>
            </footer>`
            : ""
        }
      </article>
    `
    )
    .join("");
}

function renderProcess(processContent) {
  if (!processSection || !processContent) return;
  if (processContent.ariaLabel) {
    processSection.setAttribute("aria-label", processContent.ariaLabel);
  }
  processSection.innerHTML = (processContent.cards || [])
    .map(
      (card) => `
      <div class="process-card">
        <h3>${card.title || ""}</h3>
        <p>
          ${card.description || ""}
        </p>
        ${
          card.bullets?.length
            ? `<ul class="process-list">
              ${card.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
            </ul>`
            : ""
        }
      </div>
    `
    )
    .join("");
}

function renderReviewsSection(reviewsSection) {
  if (!reviewsSection) return;
  if (reviewsHeadingEl && reviewsSection.heading) {
    reviewsHeadingEl.textContent = reviewsSection.heading;
  }
  if (reviewFormTitleEl && reviewsSection.formTitle) {
    reviewFormTitleEl.textContent = reviewsSection.formTitle;
  }
  if (reviewFormHelperEl && reviewsSection.formHelper) {
    reviewFormHelperEl.textContent = reviewsSection.formHelper;
  }
  if (reviewsSection.submitLabel && submitButton) {
    submitButtonDefaultText = reviewsSection.submitLabel;
    submitButton.textContent = submitButtonDefaultText;
  }
}

function renderFooter(footer) {
  if (!footer) return;
  if (footerTextEl && footer.text) {
    const footerCopy = footer.text.replace(/{{\s*year\s*}}/gi, '<span id="year"></span>');
    footerTextEl.innerHTML = footerCopy;
  }
  if (backToTopLink) {
    backToTopLink.textContent = footer.backToTopLabel || "Back to top";
    backToTopLink.setAttribute("href", footer.backToTopHref || "#top");
  }
  updateYear();
}

function updateSiteMeta(site) {
  if (!site) return;
  if (site.title) {
    document.title = site.title;
  }
  if (site.description) {
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute("content", site.description);
  }
  if (site.theme && !localStorage.getItem(THEME_STORAGE_KEY)) {
    document.documentElement.dataset.theme = site.theme;
  }

  if (site.meta) {
    const { ogTitle, ogDescription, url, image } = site.meta;
    if (ogTitle) {
      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      ogTitleMeta?.setAttribute("content", ogTitle);
    }
    if (ogDescription) {
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
      ogDescriptionMeta?.setAttribute("content", ogDescription);
    }
    if (url) {
      const ogUrlMeta = document.querySelector('meta[property="og:url"]');
      ogUrlMeta?.setAttribute("content", url);
    }
    if (image) {
      const ogImageMeta = document.querySelector('meta[property="og:image"]');
      ogImageMeta?.setAttribute("content", image);
    }
  }
}

function updateYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
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

function initializeNavToggle() {
  if (!navToggle || !siteHeader) return;

  const setMenuState = (isOpen) => {
    siteHeader.dataset.menuOpen = String(isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  };

  navToggle.addEventListener("click", () => {
    const isOpen = siteHeader.dataset.menuOpen === "true";
    setMenuState(!isOpen);
  });

  navList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a");
    if (link && window.matchMedia("(max-width: 719px)").matches) {
      setMenuState(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 720px)").matches) {
      setMenuState(false);
    }
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
