import { db, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "./firebase-config.js";
import { requireTeacherAuth } from "./teacher-guard.js";

await requireTeacherAuth();

// Your Cloudflare Worker that sends push notifications
const NOTIFY_WORKER_URL = "https://pratibha-notify.hasanujzamal6.workers.dev";

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showFormError(message) {
  const box = document.getElementById("updateFormError");
  box.textContent = message;
  box.classList.add("show");
}
function hideFormError() {
  document.getElementById("updateFormError").classList.remove("show");
}

// ---------- Toggle add-update form ----------
const toggleBtn = document.getElementById("toggleAddUpdateBtn");
const addPanel = document.getElementById("addUpdatePanel");
const form = document.getElementById("addUpdateForm");
const submitBtn = document.getElementById("addUpdateSubmit");

toggleBtn.addEventListener("click", () => {
  const showing = addPanel.style.display === "block";
  addPanel.style.display = showing ? "none" : "block";
  toggleBtn.textContent = showing ? "+ New Update" : "Close";
  if (!showing) hideFormError();
});

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
          <div>No updates posted yet. Add your first one above.</div>
        </div>`;
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const u = docSnap.data();
      const date = u.createdAt?.toDate
        ? u.createdAt.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
        : "";

      const item = document.createElement("div");
      item.className = "update-item";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "flex-start";
      item.style.gap = "10px";
      item.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div class="update-title">${escapeHTML(u.title || "Update")}</div>
          <div class="update-date">${date}</div>
          <div class="update-msg">${escapeHTML(u.message || "")}</div>
        </div>
        <button class="nav-item" style="color:var(--danger); flex-direction:row;" data-delete-id="${docSnap.id}" title="Delete">🗑</button>`;

      item.querySelector("[data-delete-id]").addEventListener("click", async () => {
        const ok = confirm(`Delete "${u.title || "this update"}"? This can't be undone.`);
        if (!ok) return;
        try {
          await deleteDoc(doc(db, "updates", docSnap.id));
          loadUpdates();
        } catch (err) {
          console.error(err);
          alert("Couldn't delete this update. Please try again.");
        }
      });

      listEl.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Couldn't load updates.</div>`;
  }
}

// ---------- Post new update (and optionally notify students) ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormError();
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span>';

  const title = document.getElementById("updateTitle").value.trim();
  const message = document.getElementById("updateMessage").value.trim();
  const shouldNotify = document.getElementById("sendNotifyCheckbox").checked;

  try {
    await addDoc(collection(db, "updates"), {
      title,
      message,
      createdAt: serverTimestamp()
    });

    if (shouldNotify) {
      try {
        await fetch(NOTIFY_WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message })
        });
      } catch (notifyErr) {
        console.error("Notification send failed (update was still posted):", notifyErr);
        // Non-critical — the update itself was already saved successfully
      }
    }

    form.reset();
    document.getElementById("sendNotifyCheckbox").checked = true; // reset default for next time
    addPanel.style.display = "none";
    toggleBtn.textContent = "+ New Update";
    loadUpdates();
  } catch (err) {
    console.error(err);
    showFormError("Couldn't post the update. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Update";
  }
});

loadUpdates();
