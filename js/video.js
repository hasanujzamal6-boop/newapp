import { db, doc, getDoc, setDoc, serverTimestamp } from "./firebase-config.js";
import { requireAuth } from "./nav-guard.js";

const user = await requireAuth();

const params = new URLSearchParams(window.location.search);
const subjectId = params.get("subject");
const lessonId = params.get("lesson");

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = `subject.html?id=${encodeURIComponent(subjectId)}`;
});

if (!subjectId || !lessonId) {
  window.location.href = "home.html";
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Save the student's watch percentage for this lesson.
// Only ever moves forward — rewatching from the start won't erase earlier progress.
let lastSavedPercent = 0;
async function saveProgress(percent) {
  const rounded = Math.round(percent);
  if (rounded <= lastSavedPercent) return; // don't save backwards/duplicate values
  lastSavedPercent = rounded;

  try {
    await setDoc(doc(db, "users", user.uid, "watched", `${subjectId}_${lessonId}`), {
      subjectId,
      lessonId,
      percent: rounded,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Couldn't save progress:", err);
  }
}

// Load any previously saved progress so we don't save backwards on a rewatch
async function loadExistingProgress() {
  try {
    const snap = await getDoc(doc(db, "users", user.uid, "watched", `${subjectId}_${lessonId}`));
    if (snap.exists() && typeof snap.data().percent === "number") {
      lastSavedPercent = snap.data().percent;
    }
  } catch (err) {
    console.error("Couldn't load existing progress:", err);
  }
}

// Wire up real playback tracking using Vimeo's Player API
function attachVimeoTracking(iframeEl) {
  if (typeof Vimeo === "undefined") {
    console.warn("Vimeo Player script not loaded — progress won't be tracked.");
    return;
  }

  const player = new Vimeo.Player(iframeEl);

  player.on("timeupdate", (data) => {
    if (!data.duration) return;
    const percent = (data.seconds / data.duration) * 100;
    saveProgress(percent);
  });

  player.on("ended", () => {
    saveProgress(100);
  });
}

async function loadLesson() {
  const frameWrap = document.getElementById("videoFrameWrap");
  try {
    const snap = await getDoc(doc(db, "subjects", subjectId, "lessons", lessonId));
    if (!snap.exists()) {
      frameWrap.innerHTML = `<div class="loading-row" style="color:#fff;">Lesson not found.</div>`;
      return;
    }
    const l = snap.data();
    document.title = `Pratibha — ${l.title || "Lesson"}`;
    document.getElementById("lessonTitle").textContent = l.title || "Untitled lesson";
    document.getElementById("lessonDesc").textContent = l.description || "";

    if (l.videoEmbedUrl) {
      await loadExistingProgress();

      frameWrap.innerHTML = `<iframe
        id="lessonVideoFrame"
        src="${escapeHTML(l.videoEmbedUrl)}"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowfullscreen
        loading="lazy"
        title="${escapeHTML(l.title || "Lesson video")}"></iframe>`;

      const isVimeo = l.videoEmbedUrl.includes("vimeo.com");
      if (isVimeo) {
        const iframeEl = document.getElementById("lessonVideoFrame");
        attachVimeoTracking(iframeEl);
      }
    } else {
      frameWrap.innerHTML = `<div class="loading-row" style="color:#fff;">No video URL set for this lesson.</div>`;
    }
  } catch (err) {
    console.error(err);
    frameWrap.innerHTML = `<div class="loading-row" style="color:#fff;">Couldn't load this video.</div>`;
  }
}

loadLesson();
