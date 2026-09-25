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

function renderPlan(plan) {
  const card = document.getElementById("planCard");
  card.hidden = false;

  document.getElementById("planTitle").textContent =
    `${plan.title || "Your trip"}`;

  const metaParts = [];
  if (plan.destination) metaParts.push(`📍 ${plan.destination}`);
  if (plan.startDate || plan.endDate) {
    metaParts.push(
      `📅 ${formatDate(plan.startDate)} → ${formatDate(plan.endDate)}`,
    );
  }
  document.getElementById("planMeta").textContent = metaParts.join("   ·   ");

  const travelers = document.getElementById("travelersList");
  travelers.innerHTML = "";
  (plan.travelers || []).forEach((t) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `👤 ${t}`;
    travelers.appendChild(chip);
  });
  travelers.hidden = !(plan.travelers && plan.travelers.length);

  document.getElementById("planSummary").textContent = plan.summary || "";

  const segments = document.getElementById("segmentsList");
  segments.innerHTML = "";
  (plan.segments || []).forEach(renderSegment);

  document.getElementById("deletePlanBtn").onclick = () =>
    deleteTrip(plan.id, plan.title);

  document.getElementById("editCard").hidden = true;

  const chatCard = document.getElementById("chatCard");
  chatCard.hidden = false;
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = "";
  (plan.chatHistory || []).forEach((m) => appendChat(m.role, m.content));
}

const SEGMENT_EMOJI = {
  Flight: "✈️",
  Hotel: "🏨",
  Activity: "🎫",
  Transport: "🚆",
  Other: "📍",
};

function renderSegment(seg) {
  const container = document.getElementById("segmentsList");

  const item = document.createElement("div");
  item.className = "segment";

  const head = document.createElement("div");
  head.className = "segment-head";

  const emoji = document.createElement("span");
  emoji.className = "segment-emoji";
  emoji.textContent = SEGMENT_EMOJI[seg.type] || "📍";

  const title = document.createElement("span");
  title.className = "segment-title";
  title.textContent = seg.title || seg.type || "Item";

  head.append(emoji, title);
  item.appendChild(head);

  const metaParts = [];
  if (seg.start) metaParts.push(formatDateTime(seg.start));
  if (seg.end) metaParts.push("→ " + formatDateTime(seg.end));
  if (seg.location) metaParts.push("📍 " + seg.location);
  if (seg.reference) metaParts.push("🔖 " + seg.reference);

  if (metaParts.length) {
    const meta = document.createElement("div");
    meta.className = "segment-meta";
    meta.textContent = metaParts.join("   ·   ");
    item.appendChild(meta);
  }

  if (seg.details) {
    const details = document.createElement("div");
    details.className = "segment-details";
    details.textContent = seg.details;
    item.appendChild(details);
  }

  container.appendChild(item);
}

let editDocuments = [];

function startEdit() {
  if (!currentPlan) return;

  editDocuments = [...(currentPlan.documents || [])];
  renderEditDocuments();

  document.getElementById("editStatus").textContent = "";
  document.getElementById("editDropzoneText").textContent = "Add more files…";

  document.getElementById("planCard").hidden = true;
  document.getElementById("editCard").hidden = false;
  document.getElementById("editCard").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  document.getElementById("editCard").hidden = true;

  if (currentPlan) {
    renderPlan(currentPlan);
  }
}

function renderEditDocuments() {
  const list = document.getElementById("editDocumentList");
  list.innerHTML = "";

  if (!editDocuments.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No files. Add at least one booking.";
    list.appendChild(li);
    return;
  }

  editDocuments.forEach((doc, i) => {
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
    remove.title = "Remove file";
    remove.addEventListener("click", () => {
      editDocuments.splice(i, 1);
      renderEditDocuments();
    });

    li.append(info, remove);
    list.appendChild(li);
  });
}

function setStatus(msg, isError) {
  const status = document.getElementById("status");
  status.textContent = msg;
  status.classList.toggle("error", !!isError);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

loadTrips();
