import { db, auth, messaging, doc, setDoc, getToken, serverTimestamp } from "./firebase-config.js";

// ⚠️ Paste the VAPID key you copied from Firebase Console → Project settings → Cloud Messaging
const VAPID_KEY = "BHAYwoMiq0I8Hqc6MrTD4r5VBpvXbRIVAKmVamGaypw8LPTl4h4HaKRmd8Xib6JLQ8E0MqIf36bwa3RYlMCeqmM";

// Call this once the page loads. It decides whether to show the
// "Enable Notifications" banner, and wires up the button's click.
export function initNotificationBanner(user) {
  if (!("Notification" in window)) return; // browser doesn't support notifications

  const banner = document.getElementById("notifyBanner");
  const enableBtn = document.getElementById("enableNotifyBtn");
  if (!banner || !enableBtn) return;

  // Only show the banner if permission hasn't been decided yet
  if (Notification.permission === "default") {
    banner.style.display = "flex";
  }

  enableBtn.addEventListener("click", async () => {
    enableBtn.disabled = true;
    enableBtn.textContent = "Enabling…";
    await requestAndSaveToken(user);
    banner.style.display = "none";
  });
}

// The actual permission request + token save — only ever called from
// a real button click, since browsers block automatic permission popups.
async function requestAndSaveToken(user) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      await setDoc(doc(db, "users", user.uid, "devices", token), {
        token,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Notification setup failed:", err);
  }
}
