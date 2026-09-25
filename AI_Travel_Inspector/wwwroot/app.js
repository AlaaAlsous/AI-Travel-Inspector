const documents = [];
let currentPlan = null;

const TRASH_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>`;

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzoneText");

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    dropzoneText.textContent =
      fileInput.files.length === 1
        ? fileInput.files[0].name
        : `${fileInput.files.length} files selected`;
  }
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    dropzoneText.textContent =
      e.dataTransfer.files.length === 1
        ? e.dataTransfer.files[0].name
        : `${e.dataTransfer.files.length} files selected`;
  }
});

async function analyze() {
  const btn = document.getElementById("analyzeBtn");

  if (!fileInput.files.length) {
    setStatus("Select a file first.", true);
    return;
  }

  const files = [...fileInput.files];
  btn.disabled = true;

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    setStatus(`⏳ Extracting "${file.name}"...`, false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Unexpected server response.");
      }
      if (!response.ok)
        throw new Error(data.error || data.detail || "Extraction failed.");
      documents.push(data);
    } catch (err) {
      setStatus("❌ " + err.message, true);
      btn.disabled = false;
      fileInput.value = "";
      dropzoneText.textContent = "Choose files or drag them here";
      return;
    }
  }

  renderDocuments();
  setStatus(`✅ Extracted ${documents.length} document(s).`, false);
  btn.disabled = false;
  fileInput.value = "";
  dropzoneText.textContent = "Choose files or drag them here";
}


function setStatus(msg, isError) {
  const status = document.getElementById("status");
  status.textContent = msg;
  status.classList.toggle("error", !!isError);
}

