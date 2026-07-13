(function () {
  "use strict";

  document.documentElement.classList.replace("no-js", "js");

  const config = window.REDLINE_SITE_CONFIG || {};

  function repositoryUrl() {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith(".github.io")) {
      const owner = host.replace(/\.github\.io$/, "");
      const repository = window.location.pathname.split("/").filter(Boolean)[0];
      if (owner && repository) {
        return `https://github.com/${owner}/${repository}`;
      }
    }

    return config.repositoryUrl || "";
  }

  const repo = repositoryUrl().replace(/\/$/, "");
  document.querySelectorAll("[data-repo-path]").forEach((link) => {
    if (repo) {
      link.href = `${repo}${link.dataset.repoPath}`;
    }
  });

  const stores = {
    chrome: config.chromeStoreUrl,
    firefox: config.firefoxAddonsUrl,
  };

  document.querySelectorAll("[data-store]").forEach((link) => {
    const url = stores[link.dataset.store];
    if (url) {
      link.href = url;
      link.hidden = false;
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  function closeNavigation() {
    if (!navToggle || !nav) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const opening = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", opening);
      navToggle.setAttribute("aria-expanded", String(opening));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNavigation();
        navToggle.focus();
      }
    });
  }

  const showcaseImage = document.querySelector("[data-showcase-image]");
  const showcaseCaption = document.querySelector("figcaption[data-showcase-caption]");
  const showcaseButtons = document.querySelectorAll("[data-showcase-src]");

  if (showcaseImage && showcaseCaption && showcaseButtons.length) {
    showcaseButtons.forEach((button) => {
      const preload = new Image();
      preload.src = button.dataset.showcaseSrc;

      button.addEventListener("click", () => {
        showcaseButtons.forEach((item) => {
          item.setAttribute("aria-pressed", "false");
        });
        button.setAttribute("aria-pressed", "true");
        showcaseImage.src = button.dataset.showcaseSrc;
        showcaseImage.alt = button.dataset.showcaseAlt;
        showcaseCaption.textContent = button.dataset.showcaseCaption;
      });
    });
  }
})();
