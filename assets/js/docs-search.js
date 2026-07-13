(function () {
  "use strict";

  const input = document.querySelector("[data-docs-search]");
  const results = document.querySelector("[data-docs-results]");
  const status = document.querySelector("[data-docs-search-status]");

  if (!input || !results || !status) return;

  const documents = [
    {
      title: "Getting started",
      description: "Open Redline, use Save changes, capture a passage, organize a dossier, search, and make a first backup.",
      href: "getting-started.html",
      keywords: "install setup first run Page Save changes Save source annotation dossier shortcut library backup",
    },
    {
      title: "Save a page or quick source",
      description: "Learn why the Page tab says Save changes while the right-click command says Save source.",
      href: "capture-and-annotations.html#save-page",
      keywords: "save changes save source Page tab right click context menu shortcut quick capture source URL",
    },
    {
      title: "Capture selected text",
      description: "Use floating HL, C, S, Q, and FU buttons or the Redline context menu, then edit the saved annotation.",
      href: "capture-and-annotations.html#floating-menu",
      keywords: "selection floating menu highlight claim source question follow up HL C S Q FU immediate capture",
    },
    {
      title: "Write and edit annotations",
      description: "Capture a manual finding and add its kind, note, tags, dossiers, or review status in the Library.",
      href: "capture-and-annotations.html#manual-finding",
      keywords: "annotation finding context next step Capture annotation edit note tags dossiers anchor status",
    },
    {
      title: "Save linked sources and image references",
      description: "Save a link or image URL as a Page record from the browser context menu.",
      href: "capture-and-annotations.html#links-images",
      keywords: "linked source image reference right click page record image tag download bytes",
    },
    {
      title: "Dossiers and tags",
      description: "Create dossiers, assign pages and annotations, pin active work, and build stable tag conventions.",
      href: "dossiers-and-tags.html",
      keywords: "dossier tags organize linked pages annotations pin note archive scoped export membership",
    },
    {
      title: "Library navigation and Dashboard",
      description: "Open the full Library and understand Dashboard, Pages, Annotations, Dossiers, Tags, Domains, and maintenance areas.",
      href: "library-guide.html#map",
      keywords: "library navigation dashboard pages annotations dossiers tags domains search imports exports data health settings",
    },
    {
      title: "Pages, filters, and bulk actions",
      description: "Filter and edit saved Pages, use bulk organization, and distinguish read status from record archive state.",
      href: "library-guide.html#pages",
      keywords: "pages filters bulk read status importance archive state active deleted table cards",
    },
    {
      title: "Global Search",
      description: "Search saved pages, annotations, dossiers, tags, and domains and learn how sidebar Search differs.",
      href: "library-guide.html#search",
      keywords: "global search sidebar search Ctrl Cmd K slash arrow Enter Escape domains dossiers tags",
    },
    {
      title: "Data Health",
      description: "Review duplicate URLs, orphan annotations, unused tags, and maintenance counts without assuming automatic repair.",
      href: "library-guide.html#health",
      keywords: "data health duplicate URL orphan annotation unused tags maintenance restore archived deleted merge",
    },
    {
      title: "Using source records",
      description: "Understand what Redline saves and how source records differ from full offline page copies.",
      href: "using-redline.html#sources",
      keywords: "source page record url title note metadata offline archive snapshot",
    },
    {
      title: "Annotations and highlight restoration",
      description: "Choose annotation types and understand Restored, Needs review, Unresolved, and Unknown highlight states.",
      href: "using-redline.html#annotations",
      keywords: "highlight quote claim question follow-up warning selection restored needs review unresolved unknown changed page",
    },
    {
      title: "Tags, dossiers, and local search",
      description: "Organize research and understand which saved fields are included in local search.",
      href: "using-redline.html#organization",
      keywords: "tags dossiers status importance search filters library domains",
    },
    {
      title: "All-data JSON backups",
      description: "Create the only full-fidelity Redline vault backup before uninstalling, clearing data, moving profiles, or importing.",
      href: "backups-and-exports.html#json",
      keywords: "backup json all data restore recovery uninstall profile clear data import transfer destination settings domain notes",
    },
    {
      title: "Import Chrome-family bookmarks",
      description: "Turn a Chrome/Netscape bookmarks HTML export into Redline Pages and full-path dossiers in the Chrome build.",
      href: "backups-and-exports.html#bookmarks",
      keywords: "bookmark bookmarks chrome chromium edge brave html netscape import migrate migration folder folders dossier duplicate unsupported URL",
    },
    {
      title: "Import and duplicate handling",
      description: "Preview a JSON import and understand skip-by-normalized-URL versus merge-by-record-ID behavior.",
      href: "backups-and-exports.html#restore",
      keywords: "import validation duplicate skip normalized URL merge incoming existing record ID json file schema Apply Import",
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
