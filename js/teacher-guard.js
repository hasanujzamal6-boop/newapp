import { auth, db, signOut, onAuthStateChanged, doc, getDoc } from "./firebase-config.js";

// Call this at the top of any page only teachers should access.
// Resolves with { user, profile } once confirmed; redirects to index.html otherwise.
export function requireTeacherAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists() || snap.data().role !== "teacher") {
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }
      resolve({ user, profile: snap.data() });
    }); 
  });
}

export function wireTeacherLogout(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}