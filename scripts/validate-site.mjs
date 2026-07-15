import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
let checkedLocalReferences = 0;
let checkedSearchTargets = 0;
let allowedMarketplacePlaceholders = 0;

function toSitePath(file) {
  return relative(root, file).split(sep).join("/") || ".";
}

function lineNumber(text, index) {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }
  return line;
}

function addError(file, line, message) {
  errors.push({ file: toSitePath(file), line, message });
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const fullPath = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function decodeHtml(value) {
  return value.replace(
    /&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const named = {
        "&amp;": "&",
        "&quot;": '"',
        "&apos;": "'",
        "&lt;": "<",
        "&gt;": ">",
      };
      const lower = entity.toLowerCase();
      if (named[lower]) return named[lower];
      const hexadecimal = lower.startsWith("&#x");
      const numeric = entity.slice(hexadecimal ? 3 : 2, -1);
      return String.fromCodePoint(
        Number.parseInt(numeric, hexadecimal ? 16 : 10),
      );
    },
  );
}

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function preserveLines(value) {
  return value.replace(/[^\r\n]/g, " ");
}

function maskNonMarkup(html) {
  let masked = html.replace(/<!--[\s\S]*?-->/g, preserveLines);
  for (const element of ["script", "style"]) {
    const block = new RegExp(
      `(<${element}\\b[^>]*>)([\\s\\S]*?)(</${element}\\s*>)`,
      "gi",
    );
    masked = masked.replace(block, (_match, opening, content, closing) => {
      return opening + preserveLines(content) + closing;
    });
  }
  return masked;
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    attributes.set(
      match[1].toLowerCase(),
      decodeHtml(match[2] ?? match[3] ?? match[4] ?? ""),
    );
  }
  return attributes;
}

function parseStartTags(html) {
  const masked = maskNonMarkup(html);
  const tags = [];
  const pattern = /<([a-z][\w:-]*)(\s[^<>]*?)?>/gi;
  let match;
  while ((match = pattern.exec(masked)) !== null) {
    tags.push({
      name: match[1].toLowerCase(),
      attributes: parseAttributes(match[2] ?? ""),
      index: match.index,
      endIndex: pattern.lastIndex,
      line: lineNumber(masked, match.index),
    });
  }
  return { masked, tags };
}

const htmlFiles = walk(root)
  .filter((file) => file.toLowerCase().endsWith(".html"))
  .sort((left, right) => toSitePath(left).localeCompare(toSitePath(right)));

const pages = htmlFiles.map((file) => {
  const html = readFileSync(file, "utf8");
  const { masked, tags } = parseStartTags(html);
  const ids = new Map();

  for (const tag of tags) {
    if (!tag.attributes.has("id")) continue;
    const id = tag.attributes.get("id");
    if (ids.has(id)) {
      addError(
        file,
        tag.line,
        `duplicate id "${id}" (first declared on line ${ids.get(id)})`,
      );
    } else {
      ids.set(id, tag.line);
    }
  }

  const robots = tags
    .filter(
      (tag) =>
        tag.name === "meta" &&
        tag.attributes.get("name")?.toLowerCase() === "robots",
    )
    .map((tag) => tag.attributes.get("content") ?? "");

  return {
    file,
    html,
    masked,
    tags,
    ids,
    indexable: !robots.some((content) =>
      /(?:^|[,\s])noindex(?:$|[,\s])/i.test(content),
    ),
  };
});

const pagesByPath = new Map(
  pages.map((page) => [resolve(page.file).toLowerCase(), page]),
);

function localReference(value) {
  const decoded = decodeHtml(value).trim();
  if (
    !decoded ||
    decoded.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(decoded)
  ) {
    return null;
  }

  const hashIndex = decoded.indexOf("#");
  const beforeFragment =
    hashIndex === -1 ? decoded : decoded.slice(0, hashIndex);
  const fragment =
    hashIndex === -1 ? null : decodeUrlPart(decoded.slice(hashIndex + 1));
  const queryIndex = beforeFragment.indexOf("?");
  const pathPart = decodeUrlPart(
    queryIndex === -1 ? beforeFragment : beforeFragment.slice(0, queryIndex),
  );
  return { decoded, pathPart, fragment };
}

function resolveReferenceTarget(sourceFile, pathPart) {
  let target;
  if (!pathPart) {
    target = sourceFile;
  } else if (pathPart.startsWith("/")) {
    target = resolve(root, `.${pathPart}`);
  } else {
    target = resolve(dirname(sourceFile), pathPart);
  }

  const relativeTarget = relative(root, target);
  if (
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${sep}`) ||
    isAbsolute(relativeTarget)
  ) {
    return { target, outsideRoot: true };
  }

  if (pathPart.endsWith("/")) {
    target = resolve(target, "index.html");
  } else if (existsSync(target) && statSync(target).isDirectory()) {
    target = resolve(target, "index.html");
  }
  return { target, outsideRoot: false };
}

function checkReference({
  sourceFile,
  reportFile,
  line,
  label,
  value,
  attributes,
  countAsHtmlReference = true,
}) {
  const reference = localReference(value);
  if (!reference) return;

  if (
    reference.decoded === "#" &&
    attributes?.has("data-store") &&
    attributes?.has("hidden")
  ) {
    allowedMarketplacePlaceholders += 1;
    return;
  }

  if (countAsHtmlReference) checkedLocalReferences += 1;
  const { target, outsideRoot } = resolveReferenceTarget(
    sourceFile,
    reference.pathPart,
  );
  if (outsideRoot) {
    addError(
      reportFile,
      line,
      `${label} points outside the site root: "${value}"`,
    );
    return;
  }
  if (!existsSync(target)) {
    addError(reportFile, line, `${label} target does not exist: "${value}"`);
    return;
  }

  if (reference.fragment !== null) {
    if (!reference.fragment) {
      addError(reportFile, line, `${label} has an empty fragment: "${value}"`);
      return;
    }
    const targetPage = pagesByPath.get(resolve(target).toLowerCase());
    if (!targetPage) {
      addError(
        reportFile,
        line,
        `${label} fragment targets a non-HTML file: "${value}"`,
      );
      return;
    }
    if (!targetPage.ids.has(reference.fragment)) {
      addError(
        reportFile,
        line,
        `${label} fragment "#${reference.fragment}" does not exist in ${toSitePath(target)}`,
      );
    }
  }
}

for (const page of pages) {
  for (const tag of page.tags) {
    for (const attribute of ["href", "src"]) {
      if (!tag.attributes.has(attribute)) continue;
      checkReference({
        sourceFile: page.file,
        reportFile: page.file,
        line: tag.line,
        label: `${attribute} on <${tag.name}>`,
        value: tag.attributes.get(attribute),
        attributes: tag.attributes,
      });
    }
  }
}

const indexablePages = pages.filter((page) => page.indexable);
const canonicalOwners = new Map();

for (const page of indexablePages) {
  const canonicalTags = page.tags.filter((tag) => {
    if (tag.name !== "link") return false;
    return (tag.attributes.get("rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .includes("canonical");
  });
  const openGraphUrls = page.tags.filter(
    (tag) =>
      tag.name === "meta" &&
      tag.attributes.get("property")?.toLowerCase() === "og:url",
  );
  const h1Tags = page.tags.filter((tag) => tag.name === "h1");

  if (h1Tags.length !== 1) {
    addError(
      page.file,
      1,
      `indexable page must contain exactly one h1; found ${h1Tags.length}`,
    );
  }
  if (canonicalTags.length !== 1) {
    addError(
      page.file,
      canonicalTags[0]?.line ?? 1,
      `indexable page must contain exactly one canonical link; found ${canonicalTags.length}`,
    );
  }
  if (openGraphUrls.length !== 1) {
    addError(
      page.file,
      openGraphUrls[0]?.line ?? 1,
      `indexable page must contain exactly one og:url; found ${openGraphUrls.length}`,
    );
  }

  if (canonicalTags.length === 1) {
    const canonical = canonicalTags[0].attributes.get("href") ?? "";
    if (!canonical) {
      addError(page.file, canonicalTags[0].line, "canonical href is empty");
    } else if (canonicalOwners.has(canonical)) {
      addError(
        page.file,
        canonicalTags[0].line,
        `canonical URL is also used by ${toSitePath(canonicalOwners.get(canonical))}: "${canonical}"`,
      );
    } else {
      canonicalOwners.set(canonical, page.file);
    }

    if (
      openGraphUrls.length === 1 &&
      canonical !== (openGraphUrls[0].attributes.get("content") ?? "")
    ) {
      addError(
        page.file,
        openGraphUrls[0].line,
        `og:url must match the canonical URL "${canonical}"`,
      );
    }
  }
}

const sitemapFile = resolve(root, "sitemap.xml");
if (!existsSync(sitemapFile)) {
  addError(sitemapFile, 1, "sitemap.xml is missing");
} else {
  const sitemap = readFileSync(sitemapFile, "utf8");
  const locations = [];
  const locationPattern = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let locationMatch;
  while ((locationMatch = locationPattern.exec(sitemap)) !== null) {
    locations.push({
      url: decodeHtml(locationMatch[1].trim()),
      line: lineNumber(sitemap, locationMatch.index),
    });
  }

  const sitemapUrls = new Map();
  for (const location of locations) {
    if (sitemapUrls.has(location.url)) {
      addError(
        sitemapFile,
        location.line,
        `duplicate sitemap URL (first declared on line ${sitemapUrls.get(location.url)}): "${location.url}"`,
      );
    } else {
      sitemapUrls.set(location.url, location.line);
    }
  }

  for (const [canonical, owner] of canonicalOwners) {
    if (!sitemapUrls.has(canonical)) {
      addError(
        owner,
        1,
        `canonical URL is missing from sitemap.xml: "${canonical}"`,
      );
    }
  }
  for (const [location, line] of sitemapUrls) {
    if (!canonicalOwners.has(location)) {
      addError(
        sitemapFile,
        line,
        `sitemap URL has no indexable canonical page: "${location}"`,
      );
    }
  }
}

const docsDirectory = resolve(root, "docs");
const searchDirectory = resolve(root, "assets/js");
const searchFiles = existsSync(searchDirectory)
  ? readdirSync(searchDirectory)
      .filter((name) => /^docs-search(?:-v\d+\.\d+\.\d+)?\.js$/.test(name))
      .sort()
  : [];

if (searchFiles.length === 0) {
  addError(
    resolve(searchDirectory, "docs-search.js"),
    1,
    "documentation search index is missing",
  );
}

for (const searchName of searchFiles) {
  const searchFile = resolve(searchDirectory, searchName);
  const version = searchName.match(/^docs-search-v(\d+\.\d+\.\d+)\.js$/)?.[1];
  const sourceIndex = version
    ? resolve(docsDirectory, `v${version}`, "index.html")
    : resolve(docsDirectory, "index.html");
  const searchSource = readFileSync(searchFile, "utf8");
  const searchHrefPattern = /\bhref\s*:\s*(["'])(.*?)\1/g;
  let fileTargets = 0;
  let searchMatch;
  while ((searchMatch = searchHrefPattern.exec(searchSource)) !== null) {
    fileTargets += 1;
    checkedSearchTargets += 1;
    checkReference({
      sourceFile: sourceIndex,
      reportFile: searchFile,
      line: lineNumber(searchSource, searchMatch.index),
      label: "documentation search href",
      value: searchMatch[2],
      countAsHtmlReference: false,
    });
  }
  if (fileTargets === 0) {
    addError(
      searchFile,
      1,
      "documentation search index contains no href targets",
    );
  }
}

function normalizedSidebarHref(page, href) {
  const reference = localReference(href);
  if (!reference) return href;
  const { target, outsideRoot } = resolveReferenceTarget(
    page.file,
    reference.pathPart,
  );
  if (outsideRoot) return href;
  const fragment = reference.fragment === null ? "" : `#${reference.fragment}`;
  return `${toSitePath(target)}${fragment}`;
}

const docsPages = pages.filter((page) => {
  const pathFromDocs = relative(docsDirectory, page.file);
  return (
    pathFromDocs &&
    !pathFromDocs.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromDocs) &&
    page.indexable
  );
});
const expectedDocsVersions = ["1.0.2", "1.0.1", "1.0.0"];

function docsVersionForPage(page) {
  const parts = relative(docsDirectory, page.file).split(sep);
  return /^v\d+\.\d+\.\d+$/.test(parts[0]) ? parts[0].slice(1) : "1.0.2";
}

for (const page of docsPages) {
  const versionSelects = page.tags.filter(
    (tag) => tag.name === "select" && tag.attributes.has("data-docs-version"),
  );
  if (versionSelects.length !== 1) {
    addError(
      page.file,
      versionSelects[0]?.line ?? 1,
      `docs page must contain exactly one version selector; found ${versionSelects.length}`,
    );
    continue;
  }

  const select = versionSelects[0];
  const currentVersion = select.attributes.get("data-docs-current") ?? "";
  const expectedCurrent = docsVersionForPage(page);
  if (currentVersion !== expectedCurrent) {
    addError(
      page.file,
      select.line,
      `version selector declares ${currentVersion || "no version"}; expected ${expectedCurrent}`,
    );
  }

  const closingPattern = /<\/select\s*>/gi;
  closingPattern.lastIndex = select.endIndex;
  const closing = closingPattern.exec(page.masked);
  if (!closing) {
    addError(
      page.file,
      select.line,
      "docs version selector has no closing </select>",
    );
    continue;
  }
  const selectHtml = page.html.slice(select.endIndex, closing.index);
  const options = parseStartTags(selectHtml).tags.filter(
    (tag) => tag.name === "option",
  );
  const optionVersions = options.map((option) =>
    option.attributes.get("data-docs-version-option"),
  );
  if (JSON.stringify(optionVersions) !== JSON.stringify(expectedDocsVersions)) {
    addError(
      page.file,
      select.line,
      `version selector options must be [${expectedDocsVersions.join(", ")}]; found [${optionVersions.join(", ")}]`,
    );
  }
  const optionLabels = [
    ...selectHtml.matchAll(/<option\b[^>]*>([^<]*)<\/option>/gi),
  ].map((match) => match[1].trim());
  const expectedOptionLabels = expectedDocsVersions.map((version) =>
    version === expectedDocsVersions[0] ? `${version} (latest)` : version,
  );
  if (JSON.stringify(optionLabels) !== JSON.stringify(expectedOptionLabels)) {
    addError(
      page.file,
      select.line,
      `version selector labels must be [${expectedOptionLabels.join(", ")}]; found [${optionLabels.join(", ")}]`,
    );
  }
  const selectedOptions = options.filter((option) =>
    option.attributes.has("selected"),
  );
  if (
    selectedOptions.length !== 1 ||
    selectedOptions[0].attributes.get("data-docs-version-option") !==
      currentVersion
  ) {
    addError(
      page.file,
      select.line,
      `version selector must select exactly the current version ${currentVersion}`,
    );
  }

  for (const option of options) {
    checkReference({
      sourceFile: page.file,
      reportFile: page.file,
      line: select.line + option.line - 1,
      label: "value on docs version option",
      value: option.attributes.get("value") ?? "",
    });
  }
}

const guidePages = docsPages.filter(
  (page) => basename(page.file).toLowerCase() !== "index.html",
);
const sidebarSequences = [];

for (const page of guidePages) {
  const sidebars = page.tags.filter((tag) => {
    if (tag.name !== "aside") return false;
    return (tag.attributes.get("class") ?? "")
      .split(/\s+/)
      .includes("docs-nav");
  });
  if (sidebars.length !== 1) {
    addError(
      page.file,
      sidebars[0]?.line ?? 1,
      `docs guide must contain exactly one .docs-nav sidebar; found ${sidebars.length}`,
    );
    continue;
  }

  const sidebar = sidebars[0];
  const closingPattern = /<\/aside\s*>/gi;
  closingPattern.lastIndex = sidebar.endIndex;
  const closing = closingPattern.exec(page.masked);
  if (!closing) {
    addError(page.file, sidebar.line, "docs sidebar has no closing </aside>");
    continue;
  }
  const sidebarHtml = page.html.slice(sidebar.endIndex, closing.index);
  const sidebarLinks = parseStartTags(sidebarHtml)
    .tags.filter((tag) => tag.name === "a" && tag.attributes.has("href"))
    .map((tag) => normalizedSidebarHref(page, tag.attributes.get("href")));
  sidebarSequences.push({
    page,
    line: sidebar.line,
    group: dirname(relative(docsDirectory, page.file)).split(sep).join("/"),
    links: sidebarLinks,
    signature: JSON.stringify(sidebarLinks),
  });
}

const sidebarGroups = new Map();
for (const sidebar of sidebarSequences) {
  const group = sidebarGroups.get(sidebar.group) ?? [];
  group.push(sidebar);
  sidebarGroups.set(sidebar.group, group);
}

for (const groupedSidebars of sidebarGroups.values()) {
  if (groupedSidebars.length < 2) continue;
  const frequencies = new Map();
  for (const sidebar of groupedSidebars) {
    frequencies.set(
      sidebar.signature,
      (frequencies.get(sidebar.signature) ?? 0) + 1,
    );
  }
  const expectedSignature = [...frequencies.entries()].sort(
    ([leftSignature, leftCount], [rightSignature, rightCount]) =>
      rightCount - leftCount || leftSignature.localeCompare(rightSignature),
  )[0][0];
  const expectedLinks = JSON.parse(expectedSignature);

  for (const sidebar of groupedSidebars) {
    if (sidebar.signature === expectedSignature) continue;
    addError(
      sidebar.page.file,
      sidebar.line,
      `docs sidebar links/order differ; expected [${expectedLinks.join(", ")}], found [${sidebar.links.join(", ")}]`,
    );
  }
}

errors.sort(
  (left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.message.localeCompare(right.message),
);

if (errors.length > 0) {
  console.error(
    `Site validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`,
  );
  for (const error of errors) {
    console.error(`- ${error.file}:${error.line}: ${error.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    [
      `Site validation passed for ${pages.length} HTML pages`,
      `${checkedLocalReferences} local href/src references`,
      `${checkedSearchTargets} documentation search targets`,
      `${indexablePages.length} sitemap/canonical entries`,
      `${docsPages.length} docs version selectors`,
      `${guidePages.length} docs sidebars across ${sidebarGroups.size} versions`,
      `${allowedMarketplacePlaceholders} allowed marketplace placeholders`,
    ].join(", ") + ".",
  );
}
