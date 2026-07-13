(function () {
  "use strict";

  const form = document.querySelector("[data-report-builder]");
  const preview = document.querySelector("[data-report-preview]");
  const copyButton = document.querySelector("[data-copy-report]");
  const clearButton = document.querySelector("[data-clear-report]");
  const status = document.querySelector("[data-copy-status]");

  if (!form || !preview || !copyButton || !clearButton || !status) return;

  const field = (name) => form.querySelector(`[name="${name}"]`);
  const value = (name) => field(name).value.trim() || "Not provided";

  function summary() {
    return [
      "Redline environment summary",
      `Redline version: ${value("redlineVersion")}`,
      `Browser: ${value("browser")}`,
      `Browser version: ${value("browserVersion")}`,
      `Operating system: ${value("operatingSystem")}`,
      `Issue area: ${value("issueArea")}`,
      `Reproduces on a non-sensitive public page: ${value("publicReproduction")}`,
    ].join("\n");
  }

  function render() {
    preview.textContent = summary();
    status.textContent = "";
  }

  async function copySummary() {
    const text = summary();

    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Environment summary copied. Review it before pasting into a public issue.";
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      status.textContent = copied
        ? "Environment summary copied. Review it before pasting into a public issue."
        : "Copy was blocked. Select the preview text and copy it manually.";
    }
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  copyButton.addEventListener("click", copySummary);
  clearButton.addEventListener("click", () => {
    form.querySelectorAll("input, select").forEach((control) => {
      control.value = "";
    });
    render();
    field("redlineVersion").focus();
  });

  render();
})();
