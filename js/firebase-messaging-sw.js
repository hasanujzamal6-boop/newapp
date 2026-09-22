// ============================================================
// PRATIBHA — Background messaging service worker
// Handles push notifications when the app/browser is closed.
// This file MUST sit in the root folder (not inside js/) so it
// can control the whole site's notification behavior.
// ============================================================

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ⚠️ Same config as js/firebase-config.js — paste your real values here too
firebase.initializeApp({
  apiKey: "AIzaSyDuarROqIhjVJr8NFhflPkGPdhFq7Z6w3Q",
  authDomain: "pratibha-22a77.firebaseapp.com",
  projectId: "pratibha-22a77",
  storageBucket: "pratibha-22a77.firebasestorage.app",
  messagingSenderId: "283522600839",
  appId: "1:283522600839:web:7b1014e154585f0fe88d22"
});

const messaging = firebase.messaging();

// Show a notification when a push arrives while the app is in the background/closed
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Pratibha";
  const options = {
    body: payload.notification?.body || "",
    icon: "./icons/icon-512.png",
    badge: "./icons/icon-512.png"
  };
  self.registration.showNotification(title, options);
});
