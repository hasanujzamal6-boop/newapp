import { auth, signOut, onAuthStateChanged } from "./firebase-config.js";

// Call this at the top of any page that requires a logged-in student.
// Resolves with the Firebase user once confirmed; redirects to index.html otherwise.
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "index.html";
      } else {
        resolve(user);
      }
    });
  });
}

export function wireLogout(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

export function initials(name) {
  if (!name) return "S";
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}