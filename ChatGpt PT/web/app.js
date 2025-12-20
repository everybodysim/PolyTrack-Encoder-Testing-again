"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const trackNameInput = document.getElementById("trackName");
  const descriptionInput = document.getElementById("description");
  const generateBtn = document.getElementById("generateBtn");
  const errorDiv = document.getElementById("error");
  const outputDiv = document.getElementById("output");
  const outputCode = document.getElementById("outputCode");

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    outputDiv.style.display = "none";
  }

  function showOutput(code) {
    errorDiv.style.display = "none";
    outputCode.value = code;
    outputDiv.style.display = "block";
  }

  generateBtn.addEventListener("click", async () => {
    const name = trackNameInput.value.trim() || "MyTrack";
    const input = descriptionInput.value.trim();

    if (!input) {
      showError("Please enter a description.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";

    try {
      const response = await fetch("/api/encode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, input }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || "Failed to generate code");
        return;
      }

      showOutput(data.code);
    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
    }
  });
});

