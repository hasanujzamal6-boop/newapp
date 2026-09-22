import { db, collection, getDocs, query, orderBy } from "./firebase-config.js";
import { requireAuth, wireLogout, initials } from "./nav-guard.js";
import { initNotificationBanner } from "./notifications.js";

const user = await requireAuth();
initNotificationBanner(user);

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

function ringAvatarHTML(label, progressPct = 0) {
  const r = 23, c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, progressPct)) / 100) * c;
  return `
    <div class="ring-avatar">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle class="ring-bg" cx="26" cy="26" r="${r}" />
        <circle class="ring-fg" cx="26" cy="26" r="${r}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" />
      </svg>
      <div class="avatar-core">${label}</div>
    </div>`;
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
          <div>No subjects yet. Add some in Firestore under "subjects".</div>
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
        ${ringAvatarHTML(letter, s.progress || 0)}
        <div class="card-body">
          <div class="card-title">${escapeHTML(s.name || "Untitled")}</div>
          <div class="card-sub">${escapeHTML(s.description || "")}</div>
        </div>
        <div class="card-chevron">›</div>`;
      card.addEventListener("click", () => {
        window.location.href = `subject.html?id=${encodeURIComponent(docSnap.id)}`;
      });
      listEl.appendChild(card);
    });
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
