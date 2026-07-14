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

  const pendingFragmentKey = "redline-docs-pending-fragment";

  function consumePendingFragment() {
    try {
      const raw = window.sessionStorage.getItem(pendingFragmentKey);
      if (!raw) return "";
      window.sessionStorage.removeItem(pendingFragmentKey);

      const pending = JSON.parse(raw);
      if (
        pending.pathname !== window.location.pathname ||
        pending.search !== window.location.search ||
        typeof pending.hash !== "string" ||
        !pending.hash.startsWith("#")
      ) {
        return "";
      }

      return pending.hash;
    } catch {
      return "";
    }
  }

  function scrollToCurrentFragment() {
    const pendingFragment = consumePendingFragment();
    const fragment = window.location.hash || pendingFragment;
    if (fragment.length < 2) return;

    if (!window.location.hash && pendingFragment) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${pendingFragment}`);
    }

    let id;
    try {
      id = decodeURIComponent(fragment.slice(1));
    } catch {
      id = fragment.slice(1);
    }

    const target = document.getElementById(id);
    if (!target) return;

    const root = document.documentElement;
    root.classList.add("is-resolving-fragment");
    target.scrollIntoView({ block: "start" });
    window.requestAnimationFrame(() => {
      root.classList.remove("is-resolving-fragment");
    });
  }

  function queueFragmentScroll() {
    window.requestAnimationFrame(scrollToCurrentFragment);
  }

  window.addEventListener("hashchange", queueFragmentScroll);
  window.addEventListener("load", queueFragmentScroll, { once: true });
  window.addEventListener("pageshow", queueFragmentScroll);
  queueFragmentScroll();

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

  const videoFrame = document.querySelector("[data-product-video-frame]");
  const productVideo = document.querySelector("[data-product-video]");
  const videoToggle = document.querySelector("[data-video-toggle]");
  const videoRipple = document.querySelector("[data-video-ripple]");
  const videoVolumeControl = document.querySelector("[data-video-volume-control]");
  const videoVolumeToggle = document.querySelector("[data-video-volume-toggle]");
  const videoVolume = document.querySelector("[data-video-volume]");

  if (videoFrame && productVideo && videoToggle && videoRipple) {
    productVideo.controls = false;

    function syncVideoState() {
      const playing = !productVideo.paused && !productVideo.ended;
      videoFrame.classList.toggle("is-playing", playing);
      videoToggle.setAttribute("aria-label", playing ? "Pause product tour" : "Play product tour");
      videoToggle.setAttribute("aria-pressed", String(playing));
    }

    function triggerVideoRipple() {
      videoFrame.classList.remove("is-toggling");
      window.requestAnimationFrame(() => {
        videoFrame.classList.add("is-toggling");
      });
    }

    async function toggleVideo() {
      triggerVideoRipple();

      if (productVideo.paused || productVideo.ended) {
        try {
          await productVideo.play();
        } catch {
          syncVideoState();
        }
      } else {
        productVideo.pause();
      }
    }

    productVideo.addEventListener("play", syncVideoState);
    productVideo.addEventListener("pause", syncVideoState);
    productVideo.addEventListener("ended", syncVideoState);
    productVideo.addEventListener("click", toggleVideo);
    videoToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleVideo();
    });
    videoRipple.addEventListener("animationend", () => {
      videoFrame.classList.remove("is-toggling");
    });

    if (videoVolumeControl && videoVolumeToggle && videoVolume) {
      let lastVolume = productVideo.volume || 1;

      function syncVolumeState() {
        const muted = productVideo.muted || productVideo.volume === 0;
        videoVolumeControl.classList.toggle("is-muted", muted);
        videoVolumeToggle.setAttribute("aria-label", muted ? "Unmute product tour" : "Mute product tour");
        videoVolumeToggle.setAttribute("aria-pressed", String(muted));
        videoVolume.value = String(muted ? 0 : productVideo.volume);
      }

      videoVolumeToggle.addEventListener("click", (event) => {
        event.stopPropagation();

        if (productVideo.muted || productVideo.volume === 0) {
          productVideo.muted = false;
          productVideo.volume = lastVolume || 0.7;
        } else {
          lastVolume = productVideo.volume;
          productVideo.muted = true;
        }
      });

      videoVolume.addEventListener("input", () => {
        const volume = Number(videoVolume.value);
        productVideo.volume = volume;
        productVideo.muted = volume === 0;

        if (volume > 0) {
          lastVolume = volume;
        }
      });

      productVideo.addEventListener("volumechange", syncVolumeState);
      syncVolumeState();
    }

    syncVideoState();
  }
})();
