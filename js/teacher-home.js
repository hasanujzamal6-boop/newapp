import { db, collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "./firebase-config.js";
import { requireTeacherAuth, wireTeacherLogout } from "./teacher-guard.js";

const { profile } = await requireTeacherAuth();

document.getElementById("avatarBtn").textContent = (profile.name || "T").trim()[0].toUpperCase();
wireTeacherLogout(document.getElementById("logoutBtn"));

// ---------- Toggle add-subject form ----------
const toggleBtn = document.getElementById("toggleAddSubjectBtn");
const addPanel = document.getElementById("addSubjectPanel");
toggleBtn.addEventListener("click", () => {
  const showing = addPanel.style.display === "block";
  addPanel.style.display = showing ? "none" : "block";
  toggleBtn.textContent = showing ? "+ Add Subject" : "Close";
});

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showFormError(message) {
  const box = document.getElementById("subjectFormError");
  box.textContent = message;
  box.classList.add("show");
}
function hideFormError() {
  document.getElementById("subjectFormError").classList.remove("show");
}

// ---------- Load subjects ----------
async function loadSubjects() {
  const listEl = document.getElementById("subjectList");
  try {
    const q = query(collection(db, "subjects"), orderBy("order", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">📚</div>
          <div>No subjects yet. Add your first one above.</div>
        </div>`;
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const s = docSnap.data();
      const letter = (s.icon || s.name || "?").trim()[0].toUpperCase();
      const card = document.createElement("div");
      card.className = "subject-card";
      card.innerHTML = `
        <div class="ring-avatar">
          <div class="avatar-core" style="position:static; width:52px; height:52px;">${escapeHTML(letter)}</div>
        </div>
        <div class="card-body">
          <div class="card-title">${escapeHTML(s.name || "Untitled")}</div>
          <div class="card-sub">${escapeHTML(s.description || "")}</div>
        </div>
        <div class="card-chevron">›</div>`;
      card.addEventListener("click", () => {
        window.location.href = `teacher-subject.html?id=${encodeURIComponent(docSnap.id)}`;
      });
      listEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load subjects.</div>`;
  }
}

// ---------- Add subject ----------
document.getElementById("addSubjectForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormError();
  const submitBtn = document.getElementById("addSubjectSubmit");
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span>';

  const name = document.getElementById("subjectName").value.trim();
  const description = document.getElementById("subjectDesc").value.trim();
  const icon = document.getElementById("subjectIcon").value.trim();

  try {
    // New subjects go to the end of the order
    const existing = await getDocs(collection(db, "subjects"));
    const nextOrder = existing.size + 1;

    await addDoc(collection(db, "subjects"), {
      name,
      description,
      icon: icon || name[0] || "?",
      order: nextOrder,
      progress: 0,
      createdAt: serverTimestamp()
    });

    document.getElementById("addSubjectForm").reset();
    document.getElementById("addSubjectPanel").style.display = "none";
    toggleBtn.textContent = "+ Add Subject";
    loadSubjects();
  } catch (err) {
    console.error(err);
    showFormError("Couldn't add the subject. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

loadSubjects();