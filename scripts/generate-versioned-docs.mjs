import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = resolve(root, "docs");
const currentVersion = "1.0.3";
const releaseDate = "2026-07-15";
const historicalVersions = [
  {
    version: "1.0.2",
    commit: "24311090570127b21123a5e07699d5e7954f0489",
    releaseDate: "2026-07-15",
    additionalPages: ["evidence-compiler.html"],
  },
  { version: "1.0.1", commit: "b0fd6ad", releaseDate: "2026-07-14" },
  { version: "1.0.0", commit: "f18ba98", releaseDate: "2026-07-13" },
];
const versions = [
  currentVersion,
  ...historicalVersions.map(({ version }) => version),
];
const historicalPages = [
  "index.html",
  "getting-started.html",
  "capture-and-annotations.html",
  "dossiers-and-tags.html",
  "library-guide.html",
  "using-redline.html",
  "backups-and-exports.html",
  "browser-support.html",
  "troubleshooting.html",
  "faq.html",
  "release-notes.html",
];
const versionMarker =
  /\s*<!-- docs-version:start -->[\s\S]*?<!-- docs-version:end -->/g;

function gitFile(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], {
    cwd: root,
    encoding: "utf8",
  });
}

function pageForVersion(page, version) {
  if (
    page === "evidence-compiler.html" &&
    !["1.0.2", "1.0.3"].includes(version)
  ) {
    return "index.html";
  }
  return page;
}

function versionHref(contextVersion, targetVersion, page) {
  const targetPage = pageForVersion(page, targetVersion);
  if (contextVersion === currentVersion) {
    return targetVersion === currentVersion
      ? targetPage
      : `v${targetVersion}/${targetPage}`;
  }
  if (targetVersion === currentVersion) return `../${targetPage}`;
  if (targetVersion === contextVersion) return targetPage;
  return `../v${targetVersion}/${targetPage}`;
}

function versionSwitcher(contextVersion, page) {
  const id = `docs-version-${contextVersion.replaceAll(".", "-")}-${page.replace(/\W+/g, "-")}`;
  const options = versions
    .map((version) => {
      const selected = version === contextVersion ? " selected" : "";
      const latest = version === currentVersion ? " (latest)" : "";
      return `<option value="${versionHref(contextVersion, version, page)}" data-docs-version-option="${version}"${selected}>${version}${latest}</option>`;
    })
    .join("");

  return `
          <!-- docs-version:start -->
          <div class="docs-version-switcher">
            <label for="${id}">Redline version</label>
            <select id="${id}" data-docs-version data-docs-current="${contextVersion}" data-docs-page="${page}">${options}</select>
          </div>
          <!-- docs-version:end -->`;
}

function injectVersionSwitcher(html, contextVersion, page) {
  const clean = html.replace(versionMarker, "");
  const switcher = versionSwitcher(contextVersion, page);
  if (page === "index.html") {
    const anchor = '<div class="search-panel">';
    if (!clean.includes(anchor)) {
      throw new Error(
        `Cannot find docs overview switcher anchor for ${contextVersion}`,
      );
    }
    return clean.replace(anchor, `${anchor}${switcher}`);
  }

  const anchor = '<span class="docs-nav-title">Documentation</span>';
  if (!clean.includes(anchor)) {
    throw new Error(
      `Cannot find docs sidebar switcher anchor in ${page} for ${contextVersion}`,
    );
  }
  return clean.replace(anchor, `${anchor}${switcher}`);
}

function transformHistoricalHtml(html, version, page) {
  let transformed = html
    .replaceAll(
      "https://theanarchox.github.io/redline-support/docs/",
      `https://theanarchox.github.io/redline-support/docs/v${version}/`,
    )
    .replaceAll("../assets/", "../../assets/")
    .replaceAll("../index.html", "../../index.html")
    .replaceAll("../privacy.html", "../../privacy.html")
    .replaceAll("../support.html", "../../support.html")
    .replace(
      "../../assets/js/docs-search.js",
      `../../assets/js/docs-search-v${version}.js`,
    )
    .replace(
      /<span class="meta-pill">Redline 1\.0(?:\.\d+)?<\/span>/,
      `<span class="meta-pill">Redline ${version}</span>`,
    );

  transformed = injectVersionSwitcher(transformed, version, page);
  return transformed;
}

async function updateCurrentDocs() {
  const entries = await readdir(docsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".html")
      continue;
    const path = resolve(docsRoot, entry.name);
    let html = await readFile(path, "utf8");
    html = html.replace(
      /<span class="meta-pill">Redline 1\.0(?:\.\d+)?<\/span>/,
      `<span class="meta-pill">Redline ${currentVersion}</span>`,
    );
    html = injectVersionSwitcher(html, currentVersion, entry.name);
    await writeFile(path, html);
  }
}

async function generateHistoricalDocs() {
  for (const snapshot of historicalVersions) {
    const targetDirectory = resolve(docsRoot, `v${snapshot.version}`);
    const relativeTarget = relative(docsRoot, targetDirectory);
    if (
      relativeTarget === ".." ||
      relativeTarget.startsWith(`..${sep}`) ||
      targetDirectory === docsRoot
    ) {
      throw new Error(`Unsafe versioned-docs target: ${targetDirectory}`);
    }

    await rm(targetDirectory, { recursive: true, force: true });
    await mkdir(targetDirectory, { recursive: true });

    const pages = [...historicalPages, ...(snapshot.additionalPages ?? [])];
    for (const page of pages) {
      const source = gitFile(snapshot.commit, `docs/${page}`);
      const transformed = transformHistoricalHtml(
        source,
        snapshot.version,
        page,
      );
      await writeFile(resolve(targetDirectory, page), transformed);
    }

    const searchSource = gitFile(
      snapshot.commit,
      "assets/js/docs-search.js",
    ).replaceAll('href: "../privacy.html', 'href: "../../privacy.html');
    await writeFile(
      resolve(root, `assets/js/docs-search-v${snapshot.version}.js`),
      searchSource,
    );
  }
}

async function walkHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtml(path)));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".html") {
      files.push(path);
    }
  }
  return files;
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function lastModified(url) {
  const historical = historicalVersions.find(({ version }) =>
    url.includes(`/docs/v${version}/`),
  );
  return historical?.releaseDate ?? releaseDate;
}

async function generateSitemap() {
  const pages = [];
  for (const file of await walkHtml(root)) {
    const html = await readFile(file, "utf8");
    if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;
    const canonical = html.match(
      /<link\s+rel="canonical"\s+href="([^"]+)"/i,
    )?.[1];
    if (canonical) pages.push(canonical);
  }

  pages.sort((left, right) => {
    const home = "https://theanarchox.github.io/redline-support/";
    if (left === home) return -1;
    if (right === home) return 1;
    return left.localeCompare(right);
  });

  const urls = pages
    .map((url) => {
      const image =
        url === "https://theanarchox.github.io/redline-support/"
          ? `
    <image:image>
      <image:loc>https://theanarchox.github.io/redline-support/assets/images/redline-social-card.png</image:loc>
      <image:title>Redline — Annotate the web. Keep the evidence.</image:title>
      <image:caption>A local-first browser research companion for saving sources, annotating passages, compiling claims, and exporting research.</image:caption>
    </image:image>`
          : "";
      return `  <url>
    <loc>${xmlEscape(url)}</loc>
    <lastmod>${lastModified(url)}</lastmod>${image}
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${urls}
</urlset>
`;
  await writeFile(resolve(root, "sitemap.xml"), sitemap);
}

await updateCurrentDocs();
await generateHistoricalDocs();
await generateSitemap();

console.log(
  `Generated documentation for ${versions.join(", ")} and refreshed sitemap.xml.`,
);
