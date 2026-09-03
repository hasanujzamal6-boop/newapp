import { db, collection, getDocs, query, where, orderBy } from "./firebase-config.js";
import { requireAuth, wireLogout, initials } from "./nav-guard.js";

const user = await requireAuth();

document.getElementById("avatarBtn").textContent = initials(user.displayName);
wireLogout(document.getElementById("logoutBtn"));

// ---------- Tabs ----------
const tabClasses = document.getElementById("tabClasses");
const tabUpdates = document.getElementById("tabUpdates");
const classesPanel = document.getElementById("classesPanel");
const updatesPanel = document.getElementById("updatesPanel");

tabClasses.addEventListener("click", () => switchTab("classes"));
tabUpdates.addEventListener("click", () => switchTab("updates"));

function switchTab(which) {
  const showClasses = which === "classes";
  tabClasses.classList.toggle("active", showClasses);
  tabUpdates.classList.toggle("active", !showClasses);
  classesPanel.style.display = showClasses ? "block" : "none";
  updatesPanel.style.display = showClasses ? "none" : "block";
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Fetch the set of "subjectId_lessonId" keys this student has already watched
async function getWatchedSet() {
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "watched"));
    const set = new Set();
    snap.forEach((docSnap) => set.add(docSnap.id));
    return set;
  } catch (err) {
    console.error("Couldn't load watched lessons:", err);
    return new Set();
  }
}

// ---------- Load subjects (with progress bar per subject) ----------
async function loadSubjects() {
  const listEl = document.getElementById("subjectList");
  try {
    const q = query(collection(db, "subjects"), orderBy("order", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">📚</div>
          <div>No subjects yet. Add some in Firestore under "subjects".</div>
        </div>`;
      return;
    }

    const watchedSet = await getWatchedSet();

    listEl.innerHTML = "";

    for (const docSnap of snap.docs) {
      const s = docSnap.data();
      const subjectId = docSnap.id;
      const letter = (s.icon || s.name || "?").trim()[0].toUpperCase();

      // Count how many of this subject's lessons have a video AND have been watched
      let percent = 0;
      try {
        const lessonsSnap = await getDocs(collection(db, "subjects", subjectId, "lessons"));
        const lessonsWithVideo = lessonsSnap.docs.filter((l) => l.data().videoEmbedUrl);
        if (lessonsWithVideo.length > 0) {
          const watchedCount = lessonsWithVideo.filter((l) =>
            watchedSet.has(`${subjectId}_${l.id}`)
          ).length;
          percent = Math.round((watchedCount / lessonsWithVideo.length) * 100);
        }
      } catch (err) {
        console.error(`Couldn't compute progress for ${subjectId}:`, err);
      }

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
        <div class="card-chevron">›</div>
        <div class="subject-progress-track">
          <div class="subject-progress-fill" style="width:${percent}%;"></div>
        </div>`;
      card.addEventListener("click", () => {
        window.location.href = `subject.html?id=${encodeURIComponent(subjectId)}`;
      });
      listEl.appendChild(card);
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load subjects. Check your Firebase setup / Firestore rules.</div>`;
  }
}

// ---------- Load updates ----------
async function loadUpdates() {
  const listEl = document.getElementById("updatesList");
  try {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="icon">📣</div>
          <div>No updates yet. Check back soon!</div>
        </div>`;
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const u = docSnap.data();
      const date = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
      const item = document.createElement("div");
      item.className = "update-item";
      item.innerHTML = `
        <div class="update-title">${escapeHTML(u.title || "Update")}</div>
        <div class="update-date">${date}</div>
        <div class="update-msg">${escapeHTML(u.message || "")}</div>`;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load updates.</div>`;
  }
}

loadSubjects();
loadUpdates();