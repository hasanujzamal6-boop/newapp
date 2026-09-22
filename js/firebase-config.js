// ============================================================
// PRATIBHA — Firebase setup
// 1. Go to https://console.firebase.google.com -> create a project
// 2. Add a Web App (</> icon) -> copy the config it gives you below
// 3. Enable Authentication -> Sign-in method -> Email/Password
// 4. Create a Firestore database (Start in production mode)
// 5. Paste your Firestore security rules from firestore.rules
// ============================================================
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// ⚠️ Replace with YOUR Firebase project's config (Project settings -> General -> Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyDuarROqIhjVJr8NFhflPkGPdhFq7Z6w3Q",
  authDomain: "pratibha-22a77.firebaseapp.com",
  projectId: "pratibha-22a77",
  storageBucket: "pratibha-22a77.firebasestorage.app",
  messagingSenderId: "283522600839",
  appId: "1:283522600839:web:7b1014e154585f0fe88d22"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

export {
  app, auth, db, messaging,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
  collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, query, where, orderBy, serverTimestamp,
  getToken, onMessage
};
