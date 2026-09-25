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

async function addEditFiles() {
  const input = document.getElementById("editFileInput");
  const dropzoneText = document.getElementById("editDropzoneText");
  const status = document.getElementById("editStatus");
  const btn = document.getElementById("editAddBtn");

  if (!input.files.length) {
    status.classList.add("error");
    status.textContent = "Select a file first.";
    return;
  }

  const files = [...input.files];
  btn.disabled = true;

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    status.classList.remove("error");
    status.textContent = `⏳ Extracting "${file.name}"...`;

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
      editDocuments.push(data);
    } catch (err) {
      status.classList.add("error");
      status.textContent = "❌ " + err.message;
      btn.disabled = false;
      input.value = "";
      dropzoneText.textContent = "Add more files…";
      return;
    }
  }

  renderEditDocuments();
  status.classList.remove("error");
  status.textContent = `✅ Added ${files.length} file(s).`;
  btn.disabled = false;
  input.value = "";
  dropzoneText.textContent = "Add more files…";
}

async function saveEdit() {
  if (!currentPlan) return;

  const status = document.getElementById("editStatus");
  const btn = document.getElementById("editSaveBtn");

  if (!editDocuments.length) {
    status.classList.add("error");
    status.textContent = "Add at least one file.";
    return;
  }

  btn.disabled = true;
  status.classList.remove("error");
  status.textContent = "✨ Rebuilding the plan with the AI...";

  try {
    const response = await fetch(`/api/travel/${currentPlan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents: editDocuments }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Unexpected server response.");
    }
    if (!response.ok)
      throw new Error(
        data.error || data.detail || "Could not rebuild the plan.",
      );

    currentPlan = data;
    document.getElementById("editCard").hidden = true;
    renderPlan(data);
    loadTrips();
  } catch (err) {
    status.classList.add("error");
    status.textContent = "❌ " + err.message;
  } finally {
    btn.disabled = false;
  }
}

const editFileInput = document.getElementById("editFileInput");
editFileInput.addEventListener("change", () => {
  const text = document.getElementById("editDropzoneText");
  text.textContent =
    editFileInput.files.length === 0
      ? "Add more files…"
      : editFileInput.files.length === 1
        ? editFileInput.files[0].name
        : `${editFileInput.files.length} files selected`;
});

document.getElementById("editPlanBtn").addEventListener("click", startEdit);
document.getElementById("editCancelBtn").addEventListener("click", cancelEdit);
document.getElementById("editAddBtn").addEventListener("click", addEditFiles);
document.getElementById("editSaveBtn").addEventListener("click", saveEdit);

async function sendChat(e) {
  e.preventDefault();
  if (!currentPlan) return;

  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const message = input.value.trim();

  if (!message) return;

  appendChat("user", message);
  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch(`/api/travel/${currentPlan.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Unexpected response.");
    }
    if (!response.ok)
      throw new Error(data.error || data.detail || "Chat failed.");

    appendChat("assistant", data.answer);
    currentPlan.chatHistory = data.history;
  } catch (err) {
    appendChat("assistant", "❌ " + err.message);
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function appendChat(role, content) {
  const container = document.getElementById("chatMessages");

  const msg = document.createElement("div");
  msg.className = `chat-msg ${role === "user" ? "user" : "assistant"}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = content;

  msg.appendChild(bubble);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function loadTrips() {
  const list = document.getElementById("travelList");
  const response = await fetch("/api/travel");
  const trips = await response.json();

  list.innerHTML = "";

  if (!trips.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No trips saved yet.";
    list.appendChild(li);
    return;
  }

  trips
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((trip) => {
      const li = document.createElement("li");
      li.className = "trip-item";

      const emoji = document.createElement("span");
      emoji.className = "trip-emoji";
      emoji.textContent = "✈️";

      const wrap = document.createElement("div");
      wrap.className = "trip-title-wrap";

      const title = document.createElement("div");
      title.className = "trip-title";
      title.textContent = trip.title || "Trip";

      const meta = document.createElement("div");
      meta.className = "trip-facts";
      meta.textContent = trip.destination || "";

      wrap.append(title, meta);

      const del = document.createElement("button");
      del.className = "trip-delete";
      del.innerHTML = TRASH_ICON;
      del.title = "Delete trip";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTrip(trip.id, trip.title);
      });

      li.append(emoji, wrap, del);

      li.addEventListener("click", async () => {
        const res = await fetch(`/api/travel/${trip.id}`);
        if (!res.ok) return;
        const plan = await res.json();
        currentPlan = plan;
        renderPlan(plan);
        document
          .getElementById("planCard")
          .scrollIntoView({ behavior: "smooth" });
      });

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
