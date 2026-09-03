import { db, doc, getDoc, collection, getDocs, query, orderBy } from "./firebase-config.js";
import { requireAuth } from "./nav-guard.js";

const user = await requireAuth();

const params = new URLSearchParams(window.location.search);
const subjectId = params.get("id");
const listEl = document.getElementById("lessonList");

if (!subjectId) {
  window.location.href = "home.html";
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSubject() {
  try {
    const subjectSnap = await getDoc(doc(db, "subjects", subjectId));
    if (subjectSnap.exists()) {
      const s = subjectSnap.data();
      document.getElementById("subjectTitle").textContent = s.name || "Subject";
      document.getElementById("subjectSub").textContent = s.description || "";
      document.title = `Pratibha — ${s.name || "Lessons"}`;
    }
  } catch (err) {
    console.error(err);
  }
}

// Get this student's saved watch percentage for every lesson in this subject.
// Returns a map like { "lessonId123": 45, "lessonId456": 100 }
async function getProgressMap() {
  const map = {};
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "watched"));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.subjectId === subjectId && typeof data.percent === "number") {
        map[data.lessonId] = data.percent;
      }
    });
  } catch (err) {
    console.error("Couldn't load progress:", err);
  }
  return map;
}

async function loadLessons() {
  try {
    const q = query(collection(db, "subjects", subjectId, "lessons"), orderBy("order", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎬</div>
          <div>No lessons uploaded here yet.</div>
        </div>`;
      return;
    }

    const progressMap = await getProgressMap();

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const l = docSnap.data();
      const percent = progressMap[docSnap.id] || 0;
      const card = document.createElement("div");
      card.className = "lesson-card" + (percent >= 100 ? " watched" : "");
      card.innerHTML = `
        <div class="thumb">${percent >= 100 ? "✓" : "▶"}</div>
        <div class="card-body">
          <div class="card-title">${escapeHTML(l.title || "Untitled lesson")}${l.isNew ? '<span class="badge-new">NEW</span>' : ""}</div>
          <div class="card-sub">${escapeHTML(l.duration || "")}${percent > 0 && percent < 100 ? ` · ${percent}% watched` : ""}</div>
        </div>
        <div class="card-chevron">›</div>
        <div class="lesson-progress-track">
          <div class="lesson-progress-fill" style="width:${percent}%;"></div>
        </div>`;
      card.addEventListener("click", () => {
        window.location.href = `video.html?subject=${encodeURIComponent(subjectId)}&lesson=${encodeURIComponent(docSnap.id)}`;
      });
      listEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load lessons.</div>`;
  }
}

loadSubject();
loadLessons();