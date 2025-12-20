"use strict";

function $(id) {
  return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", () => {
  const trackName = $("trackName");
  const describer = $("describer");
  const description = $("description");
  const generateBtn = $("generateBtn");
  const clearBtn = $("clearBtn");

  const errorBox = $("errorBox");
  const outputWrap = $("outputWrap");
  const outputCode = $("outputCode");
  const copyBtn = $("copyBtn");

  function showError(msg) {
    errorBox.textContent = String(msg || "Unknown error");
    errorBox.style.display = "block";
    outputWrap.style.display = "none";
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function showOutput(code) {
    outputCode.value = code;
    outputWrap.style.display = "block";
  }

  async function copyToClipboard(text) {
    // iOS Safari works with navigator.clipboard when served over http://localhost
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // fallback
    outputCode.focus();
    outputCode.select();
    document.execCommand("copy");
  }

  clearBtn.addEventListener("click", () => {
    description.value = "";
    outputCode.value = "";
    outputWrap.style.display = "none";
    clearError();
    description.focus();
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await copyToClipboard(outputCode.value);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 900);
    } catch (e) {
      showError(`Copy failed: ${e.message}`);
    }
  });

  generateBtn.addEventListener("click", async () => {
    clearError();
    outputWrap.style.display = "none";

    const payload = {
      name: trackName.value.trim() || "MyTrack",
      describer: describer.value || "commaSimple",
      input: description.value.trim()
    };

    if (!payload.input) {
      showError("Please enter a description.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";

    try {
      const res = await fetch("/api/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || `Request failed (${res.status})`);
        return;
      }

      showOutput(data.code || "");
    } catch (e) {
      showError(e.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
    }
  });
});


