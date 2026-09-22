import {
  db, doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp
} from "./firebase-config.js";
import { requireTeacherAuth } from "./teacher-guard.js";

await requireTeacherAuth();

const params = new URLSearchParams(window.location.search);
const subjectId = params.get("id");
const listEl = document.getElementById("lessonList");

if (!subjectId) {
  window.location.href = "teacher-home.html";
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showFormError(message) {
  const box = document.getElementById("lessonFormError");
  box.textContent = message;
  box.classList.add("show");
}
function hideFormError() {
  document.getElementById("lessonFormError").classList.remove("show");
}

// ---------- Form elements ----------
const toggleBtn = document.getElementById("toggleAddLessonBtn");
const addPanel = document.getElementById("addLessonPanel");
const form = document.getElementById("addLessonForm");
const editingIdField = document.getElementById("editingLessonId");
const titleInput = document.getElementById("lessonTitle");
const descInput = document.getElementById("lessonDesc");
const durationInput = document.getElementById("lessonDuration");
const videoInput = document.getElementById("lessonVideoUrl");
const submitBtn = document.getElementById("addLessonSubmit");

toggleBtn.addEventListener("click", () => {
  const showing = addPanel.style.display === "block";
  if (showing) {
    closeForm();
  } else {
    openFormForAdd();
  }
});

function openFormForAdd() {
  form.reset();
  editingIdField.value = "";
  submitBtn.textContent = "Add Lesson";
  addPanel.style.display = "block";
  toggleBtn.textContent = "Close";
  hideFormError();
}

function openFormForEdit(lessonId, l) {
  editingIdField.value = lessonId;
  titleInput.value = l.title || "";
  descInput.value = l.description || "";
  durationInput.value = l.duration || "";
  videoInput.value = l.videoEmbedUrl || "";
  submitBtn.textContent = "Save Changes";
  addPanel.style.display = "block";
  toggleBtn.textContent = "Close";
  hideFormError();
  addPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  form.reset();
  editingIdField.value = "";
  addPanel.style.display = "none";
  toggleBtn.textContent = "+ Add Lesson";
}

// ---------- Load subject name ----------
async function loadSubject() {
  try {
    const subjectSnap = await getDoc(doc(db, "subjects", subjectId));
    if (subjectSnap.exists()) {
      const s = subjectSnap.data();
      document.getElementById("subjectTitle").textContent = s.name || "Subject";
      document.title = `Pratibha — ${s.name || "Lessons"}`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ---------- Load lessons ----------
async function loadLessons() {
  try {
    const q = query(collection(db, "subjects", subjectId, "lessons"), orderBy("order", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎬</div>
          <div>No lessons yet. Add your first one above.</div>
        </div>`;
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const l = docSnap.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.style.cursor = "default";
      card.innerHTML = `
        <div class="thumb">${l.videoEmbedUrl ? "▶" : "＋"}</div>
        <div class="card-body">
          <div class="card-title">${escapeHTML(l.title || "Untitled lesson")}</div>
          <div class="card-sub">${escapeHTML(l.duration || "")}${!l.videoEmbedUrl ? " · No video link yet" : ""}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="nav-item" style="color:var(--primary); flex-direction:row;" data-edit-id="${docSnap.id}" title="Edit">✎</button>
          <button class="nav-item" style="color:var(--danger); flex-direction:row;" data-delete-id="${docSnap.id}" title="Delete">🗑</button>
        </div>`;

      card.querySelector("[data-edit-id]").addEventListener("click", (e) => {
        e.stopPropagation();
        openFormForEdit(docSnap.id, l);
      });

      card.querySelector("[data-delete-id]").addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = confirm(`Delete "${l.title || "this lesson"}"? This can't be undone.`);
        if (!ok) return;
        try {
          await deleteDoc(doc(db, "subjects", subjectId, "lessons", docSnap.id));
          loadLessons();
        } catch (err) {
          console.error(err);
          alert("Couldn't delete this lesson. Please try again.");
        }
      });

      listEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load lessons.</div>`;
  }
}

// ---------- Add or Save lesson ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormError();
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span>';

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const duration = durationInput.value.trim();
  const videoEmbedUrl = videoInput.value.trim();
  const editingId = editingIdField.value;

  try {
    if (editingId) {
      // Editing an existing lesson
      await updateDoc(doc(db, "subjects", subjectId, "lessons", editingId), {
        title, description, duration, videoEmbedUrl
      });
    } else {
      // Adding a new lesson
      const existing = await getDocs(collection(db, "subjects", subjectId, "lessons"));
      const nextOrder = existing.size + 1;
      await addDoc(collection(db, "subjects", subjectId, "lessons"), {
        title, description, duration, videoEmbedUrl,
        order: nextOrder,
        isNew: true,
        createdAt: serverTimestamp()
      });
    }

    closeForm();
    loadLessons();
  } catch (err) {
    console.error(err);
    showFormError("Couldn't save the lesson. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? "Save Changes" : "Add Lesson";
  }
});

loadSubject();
loadLessons();
