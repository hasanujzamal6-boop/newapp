import {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
  doc, getDoc, setDoc, serverTimestamp
} from "./firebase-config.js";

// ⚠️ CHANGE THIS to your own secret code before sharing this site with teachers.
const TEACHER_ACCESS_CODE = "imhasanuj2004";

// Students sign in with a username + password. Behind the scenes we turn
// their username into a fake email address, since Firebase Auth needs an
// email format — students never see or type this.
const STUDENT_EMAIL_DOMAIN = "@students.pratibha.local";

const roleStudentBtn = document.getElementById("roleStudent");
const roleTeacherBtn = document.getElementById("roleTeacher");
const form = document.getElementById("authForm");
const nameField = document.getElementById("nameField");
const nameInput = document.getElementById("name");
const codeField = document.getElementById("codeField");
const codeInput = document.getElementById("teacherCode");
const identifierLabel = document.getElementById("identifierLabel");
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const switchLabel = document.getElementById("switchLabel");
const errorBox = document.getElementById("formError");
const forgotPasswordWrap = document.getElementById("forgotPasswordWrap");

let role = "student"; // or "teacher"
let mode = "login";    // or "signup"

// If already logged in, figure out their role and send them to the right dashboard
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const snap = await getDoc(doc(db, "users", user.uid));
  const savedRole = snap.exists() ? snap.data().role : "student";
  window.location.href = savedRole === "teacher" ? "teacher-home.html" : "home.html";
});

roleStudentBtn.addEventListener("click", () => setRole("student"));
roleTeacherBtn.addEventListener("click", () => setRole("teacher"));

function setRole(newRole) {
  role = newRole;
  roleStudentBtn.classList.toggle("active", role === "student");
  roleTeacherBtn.classList.toggle("active", role === "teacher");
  updateFieldVisibility();
  hideError();
}

switchBtn.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  updateFieldVisibility();
  hideError();
});

function updateFieldVisibility() {
  const isSignup = mode === "signup";
  const isTeacher = role === "teacher";

  nameField.style.display = isSignup ? "block" : "none";
  nameInput.required = isSignup;

  codeField.style.display = (isSignup && isTeacher) ? "block" : "none";
  codeInput.required = isSignup && isTeacher;

  // Teacher uses a real email; student uses a username
  if (isTeacher) {
    identifierLabel.textContent = "Email";
    identifierInput.type = "email";
    identifierInput.placeholder = "you@example.com";
    identifierInput.autocomplete = "email";
  } else {
    identifierLabel.textContent = "Username";
    identifierInput.type = "text";
    identifierInput.placeholder = "e.g. ananya123";
    identifierInput.autocomplete = "username";
  }

  // Forgot password only makes sense for real email accounts (teachers)
  forgotPasswordWrap.style.display = isTeacher ? "block" : "none";

  submitBtn.textContent = isSignup
    ? (isTeacher ? "Create teacher account" : "Create account")
    : "Sign in";

  switchLabel.textContent = isSignup ? "Already have an account?" : "New to Pratibha?";
  switchBtn.textContent = isSignup ? "Sign in" : "Create an account";
}

function showError(message) {
  errorBox.style.background = "";
  errorBox.style.color = "";
  errorBox.style.borderColor = "";
  errorBox.textContent = message;
  errorBox.classList.add("show");
}
function hideError() {
  errorBox.classList.remove("show");
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(username);
}

function friendlyError(err) {
  const map = {
    "auth/email-already-in-use": role === "teacher"
      ? "That email already has an account — try signing in instead."
      : "That username is already taken — please choose another, or sign in if it's yours.",
    "auth/invalid-email": role === "teacher"
      ? "That email address doesn't look right."
      : "That username isn't valid. Use 3–20 letters, numbers, or underscores.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-credential": role === "teacher" ? "Email or password is incorrect." : "Username or password is incorrect.",
    "auth/wrong-password": role === "teacher" ? "Email or password is incorrect." : "Username or password is incorrect.",
    "auth/user-not-found": role === "teacher" ? "No account found with that email." : "No account found with that username.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again."
  };
  return map[err.code] || "Something went wrong. Please try again.";
}

document.getElementById("forgotPasswordBtn").addEventListener("click", async () => {
  hideError();
  if (role !== "teacher") return; // safety guard, button is hidden anyway for students

  const email = identifierInput.value.trim();
  if (!email) {
    showError("Please enter your email address above first, then tap 'Forgot password?' again.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    errorBox.style.background = "#EAF6EC";
    errorBox.style.color = "#1E7A34";
    errorBox.style.borderColor = "#BEE3C4";
    errorBox.textContent = `A password reset link has been sent to ${email}. Check your inbox (and spam folder).`;
    errorBox.classList.add("show");
  } catch (err) {
    console.error(err);
    showError(friendlyError(err));
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const rawIdentifier = identifierInput.value.trim();
  const password = passwordInput.value;

  // Work out the real email Firebase Auth will use
  let authEmail;
  if (role === "teacher") {
    authEmail = rawIdentifier;
  } else {
    if (mode === "signup" && !isValidUsername(rawIdentifier)) {
      showError("Username should be 3–20 letters, numbers, or underscores, with no spaces.");
      return;
    }
    authEmail = rawIdentifier.toLowerCase() + STUDENT_EMAIL_DOMAIN;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span>';

  try {
    if (mode === "signup") {
      const name = nameInput.value.trim();

      if (role === "teacher") {
        const enteredCode = codeInput.value.trim();
        if (enteredCode !== TEACHER_ACCESS_CODE) {
          showError("That access code isn't correct. Please check it and try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          return;
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
      if (name) await updateProfile(cred.user, { displayName: name });

      const profile = {
        name: name || (role === "teacher" ? "Teacher" : "Student"),
        role: role === "teacher" ? "teacher" : "student",
        createdAt: serverTimestamp()
      };
      if (role === "teacher") {
        profile.email = authEmail;
      } else {
        profile.username = rawIdentifier;
      }

      await setDoc(doc(db, "users", cred.user.uid), profile);
      window.location.href = role === "teacher" ? "teacher-home.html" : "home.html";
    } else {
      const cred = await signInWithEmailAndPassword(auth, authEmail, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const savedRole = snap.exists() ? snap.data().role : "student";
      window.location.href = savedRole === "teacher" ? "teacher-home.html" : "home.html";
    }
  } catch (err) {
    console.error(err);
    showError(friendlyError(err));
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

updateFieldVisibility();
