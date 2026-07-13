(function () {
  "use strict";

  const input = document.querySelector("[data-docs-search]");
  const results = document.querySelector("[data-docs-results]");
  const status = document.querySelector("[data-docs-search-status]");

  if (!input || !results || !status) return;

  const documents = [
    {
      title: "Getting started",
      description: "Open Redline, save a source, capture a passage, organize a dossier, search, and make a first backup.",
      href: "getting-started.html",
      keywords: "install setup first run save source annotation dossier shortcut library backup",
    },
    {
      title: "Using source records",
      description: "Understand what Redline saves and how source records differ from full offline page copies.",
      href: "using-redline.html#sources",
      keywords: "source page record url title note metadata offline archive snapshot",
    },
    {
      title: "Annotations and highlight restoration",
      description: "Choose annotation types and understand restored, needs-review, and not-found highlight states.",
      href: "using-redline.html#annotations",
      keywords: "highlight quote claim question follow-up warning selection restore missing changed page",
    },
    {
      title: "Tags, dossiers, and local search",
      description: "Organize research and understand which saved fields are included in local search.",
      href: "using-redline.html#organization",
      keywords: "tags dossiers status importance search filters library domains",
    },
    {
      title: "Full JSON backups",
      description: "Protect the browser-local vault before uninstalling, clearing data, moving profiles, or importing.",
      href: "backups-and-exports.html#json",
      keywords: "backup json restore recovery uninstall profile clear data import transfer",
    },
    {
      title: "Import and duplicate handling",
      description: "Preview a JSON import and choose whether duplicate normalized URLs should be skipped or merged.",
      href: "backups-and-exports.html#restore",
      keywords: "import validation duplicate skip merge json file schema",
    },
    {
      title: "Export formats and citations",
      description: "Choose JSON, CSV ZIP, XML, Markdown, BibTeX, RIS, CSL JSON, EndNote XML, or bibliography output.",
      href: "backups-and-exports.html#formats",
      keywords: "export csv xml markdown bibtex ris csl zotero endnote citation bibliography",
    },
    {
      title: "Browser support",
      description: "Check supported desktop browsers, Firefox requirements, shortcuts, and protected-page behavior.",
      href: "browser-support.html#browsers",
      keywords: "chrome chromium edge brave firefox 142 desktop compatibility version shortcut protected pages",
    },
    {
      title: "Known limitations",
      description: "Review highlight, dynamic-page, local-storage, citation, sidebar, and offline-copy limitations.",
      href: "browser-support.html#limitations",
      keywords: "known limitations dynamic pages highlight restore local storage citation sidebar offline",
    },
    {
      title: "Selection and capture problems",
      description: "Fix a missing selection menu or capture action on supported pages.",
      href: "troubleshooting.html#capture",
      keywords: "selection menu capture missing context menu content script reload protected page",
    },
    {
      title: "Panel and sidebar problems",
      description: "Resolve shortcut conflicts and Chrome side-panel or Firefox sidebar behavior.",
      href: "troubleshooting.html#sidebar",
      keywords: "panel sidebar open shortcut conflict toolbar firefox chrome",
    },
    {
      title: "Missing local data",
      description: "What to do before changing a profile, uninstalling Redline, or clearing more data.",
      href: "troubleshooting.html#missing-data",
      keywords: "missing lost loss data profile uninstall recover backup vault",
    },
    {
      title: "Privacy and permissions",
      description: "See what Redline accesses, what remains local, and why browser permissions are needed.",
      href: "../privacy.html#permissions",
      keywords: "privacy permission all sites storage active tab downloads local analytics cloud account",
    },
    {
      title: "Frequently asked questions",
      description: "Short answers about accounts, storage, encryption, offline copies, citations, permissions, and source availability.",
      href: "faq.html",
      keywords: "faq account encryption open source cloud upload citation uninstall access websites",
    },
    {
      title: "Release notes",
      description: "See public-facing changes to Redline and its support documentation by version.",
      href: "release-notes.html",
      keywords: "release notes changelog version update changes 1.0",
    },
  ];

  function searchableText(document) {
    return `${document.title} ${document.description} ${document.keywords}`.toLowerCase();
  }

  function render(matches, query) {
    results.replaceChildren();

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = `No documentation matched “${query}”. Try a browser name, feature, or error symptom.`;
      results.append(empty);
      status.textContent = "No matching documentation.";
      return;
    }

    matches.slice(0, 8).forEach((entry) => {
      const link = document.createElement("a");
      link.className = "search-result";
      link.href = entry.href;

      const title = document.createElement("strong");
      title.textContent = entry.title;

      const description = document.createElement("span");
      description.textContent = entry.description;

      link.append(title, description);
      results.append(link);
    });

    status.textContent = `${matches.length} documentation ${matches.length === 1 ? "result" : "results"}.`;
  }

  function search() {
    const query = input.value.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);

    if (!tokens.length) {
      results.replaceChildren();
      status.textContent = "Enter a term to search the documentation.";
      return;
    }

    const matches = documents.filter((entry) => {
      const haystack = searchableText(entry);
      return tokens.every((token) => haystack.includes(token));
    });

    render(matches, query);
  }

  input.addEventListener("input", search);
  input.addEventListener("search", search);
})();
