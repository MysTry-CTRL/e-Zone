import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  initializeFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRAGfstSPJGXhPSu8Szd_AhkjNXPAHrTQ",
  authDomain: "ezone-vercel.firebaseapp.com",
  projectId: "ezone-vercel",
  storageBucket: "ezone-vercel.firebasestorage.app",
  messagingSenderId: "791280179487",
  appId: "1:791280179487:web:103e24af159139fcb6f82a"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
const auth = getAuth(app);

function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.projectId
    && firebaseConfig.appId
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateFeedbackType(type) {
  return ["bug", "suggestion"].includes(type);
}

async function hashPassword(password) {
  const value = String(password || "");
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Firebase Auth already stores passwords securely.
// passwordHash is included only because you explicitly requested a hashed Firestore field.
async function createCredentialRecord({
  name,
  email,
  password,
  role = "user",
  collectionName = "users"
}) {
  const safeName = String(name || "").trim();
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || "");
  const safeRole = role === "admin" ? "admin" : "user";

  if (!safeName || !safeEmail || !safePassword) {
    throw new Error("Name, email, and password are required.");
  }

  try {
    const authResult = await createUserWithEmailAndPassword(auth, safeEmail, safePassword);
    await updateProfile(authResult.user, { displayName: safeName });

    const passwordHash = await hashPassword(safePassword);
    const docRef = await addDoc(collection(db, collectionName), {
      authUid: authResult.user.uid,
      name: safeName,
      email: safeEmail,
      passwordHash,
      role: safeRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      ok: true,
      authUid: authResult.user.uid,
      docId: docRef.id,
      role: safeRole
    };
  } catch (error) {
    console.error(`[Firebase] Failed to create ${safeRole} credential`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create credential."
    };
  }
}

async function createUserCredential({ name, email, password }) {
  return createCredentialRecord({
    name,
    email,
    password,
    role: "user",
    collectionName: "users"
  });
}

async function createAdminCredential({ name, email, password }) {
  return createCredentialRecord({
    name,
    email,
    password,
    role: "admin",
    collectionName: "admins"
  });
}

async function loginWithEmail(email, password) {
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || "");

  try {
    const result = await signInWithEmailAndPassword(auth, safeEmail, safePassword);
    return {
      ok: true,
      user: result.user
    };
  } catch (error) {
    console.error("[Firebase] Login failed", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Login failed."
    };
  }
}

async function createFeedback({
  message,
  type,
  status = "new",
  userId = "",
  userEmail = "",
  userName = ""
}) {
  const safeMessage = String(message || "").trim();
  const safeType = String(type || "").trim().toLowerCase();
  const safeStatus = String(status || "new").trim().toLowerCase();

  if (!safeMessage) {
    throw new Error("Feedback message is required.");
  }

  if (!validateFeedbackType(safeType)) {
    throw new Error('Feedback type must be "bug" or "suggestion".');
  }

  try {
    const docRef = await addDoc(collection(db, "feedbacks"), {
      message: safeMessage,
      type: safeType,
      status: safeStatus,
      userId: String(userId || "").trim(),
      userEmail: normalizeEmail(userEmail),
      userName: String(userName || "").trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      ok: true,
      docId: docRef.id
    };
  } catch (error) {
    console.error("[Firebase] Failed to create feedback", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save feedback."
    };
  }
}

async function getFeedbacksByType(type = "all") {
  try {
    let feedbackQuery;

    if (type === "all") {
      feedbackQuery = query(
        collection(db, "feedbacks"),
        orderBy("createdAt", "desc")
      );
    } else {
      const safeType = String(type || "").trim().toLowerCase();
      if (!validateFeedbackType(safeType)) {
        throw new Error('Feedback type must be "all", "bug", or "suggestion".');
      }

      feedbackQuery = query(
        collection(db, "feedbacks"),
        where("type", "==", safeType),
        orderBy("createdAt", "desc")
      );
    }

    const snapshot = await getDocs(feedbackQuery);
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.error("[Firebase] Failed to fetch feedbacks", error);
    return [];
  }
}

async function updateFeedbackStatus(feedbackId, status = "reviewed") {
  const safeId = String(feedbackId || "").trim();
  const safeStatus = String(status || "reviewed").trim().toLowerCase();

  if (!safeId) {
    throw new Error("Feedback ID is required.");
  }

  try {
    await updateDoc(doc(db, "feedbacks", safeId), {
      status: safeStatus,
      updatedAt: serverTimestamp()
    });

    return { ok: true };
  } catch (error) {
    console.error("[Firebase] Failed to update feedback status", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update feedback status."
    };
  }
}

async function createUpdate({
  title,
  message,
  author
}) {
  const safeTitle = String(title || "").trim();
  const safeMessage = String(message || "").trim();
  const safeAuthor = String(author || "").trim();

  if (!safeTitle || !safeMessage || !safeAuthor) {
    throw new Error("Title, message, and author are required.");
  }

  try {
    const docRef = await addDoc(collection(db, "updates"), {
      title: safeTitle,
      message: safeMessage,
      author: safeAuthor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      ok: true,
      docId: docRef.id
    };
  } catch (error) {
    console.error("[Firebase] Failed to create update", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save update."
    };
  }
}

async function getUpdates() {
  try {
    const updatesQuery = query(
      collection(db, "updates"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(updatesQuery);
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.error("[Firebase] Failed to fetch updates", error);
    return [];
  }
}

// Example: user signup form handler
async function handleUserSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const result = await createUserCredential({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!result.ok) {
    console.error(result.error);
    return;
  }

  console.log("User created:", result);
}

// Example: admin creation form handler
async function handleAdminCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const result = await createAdminCredential({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!result.ok) {
    console.error(result.error);
    return;
  }

  console.log("Admin created:", result);
}

// Example: feedback form handler
async function handleFeedbackSubmit(event, currentUser) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const result = await createFeedback({
    message: formData.get("message"),
    type: formData.get("type"),
    status: "new",
    userId: currentUser?.uid || "",
    userEmail: currentUser?.email || "",
    userName: currentUser?.displayName || ""
  });

  if (!result.ok) {
    console.error(result.error);
    return;
  }

  console.log("Feedback saved:", result);
}

// Example: owner update form handler
async function handleOwnerUpdateSubmit(event, authorName) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const result = await createUpdate({
    title: formData.get("title"),
    message: formData.get("message"),
    author: authorName
  });

  if (!result.ok) {
    console.error(result.error);
    return;
  }

  console.log("Update saved:", result);
}

// Example: community tab rendering
async function renderCommunityTab(type = "all") {
  const items = await getFeedbacksByType(type);
  return items;
}

export {
  app,
  auth,
  db,
  firebaseConfig,
  isFirebaseConfigured,
  hashPassword,
  loginWithEmail,
  createUserCredential,
  createAdminCredential,
  createFeedback,
  getFeedbacksByType,
  updateFeedbackStatus,
  createUpdate,
  getUpdates,
  handleUserSignup,
  handleAdminCreate,
  handleFeedbackSubmit,
  handleOwnerUpdateSubmit,
  renderCommunityTab
};
