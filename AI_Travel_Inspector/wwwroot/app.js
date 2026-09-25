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

function renderDocuments() {
  const card = document.getElementById("documentsCard");
  const list = document.getElementById("documentList");
  const btn = document.getElementById("planBtn");

  card.hidden = documents.length === 0;
  list.innerHTML = "";

  documents.forEach((doc, i) => {
    const li = document.createElement("li");
    li.className = "document-item";

    const info = document.createElement("div");
    info.className = "document-info";

    const name = document.createElement("span");
    name.className = "document-name";
    name.textContent = `📄 ${doc.fileName}`;

    const meta = document.createElement("span");
    meta.className = "document-meta";
    meta.textContent = `${doc.pageCount} page(s) · ${doc.text.length} chars`;

    info.append(name, meta);

    const remove = document.createElement("button");
    remove.className = "trip-delete";
    remove.innerHTML = TRASH_ICON;
    remove.title = "Remove Document";
    remove.addEventListener("click", () => {
      documents.splice(i, 1);
      renderDocuments();
    });

    li.append(info, remove);
    list.appendChild(li);
  });

  btn.disabled = documents.length === 0;
}

async function buildPlan() {
  const btn = document.getElementById("planBtn");

  btn.disabled = true;
  setStatus("✨ Asking Azure OpenAI to summarize your trip...", false);

  try {
    const response = await fetch("/api/travel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Unexpected server response.");
    }
    if (!response.ok)
      throw new Error(
        data.error || data.detail || "Could not build the trip plan.",
      );

    currentPlan = data;
    renderPlan(data);
    documents.length = 0;
    renderDocuments();
    setStatus("✅ Your trip is ready!", false);
    loadTrips();
    document.getElementById("planCard").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus("❌ " + err.message, true);
  } finally {
    btn.disabled = false;
  }
}


function setStatus(msg, isError) {
  const status = document.getElementById("status");
  status.textContent = msg;
  status.classList.toggle("error", !!isError);
}
