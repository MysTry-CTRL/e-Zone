import { auth, db, isFirebaseConfigured } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const CATEGORY_ORDER = [
  "Love and Romance",
  "Fiction",
  "Biography",
  "Science and Tech"
];

const OWNER_ACCOUNT = {
  email: "abirxxdbrine2024@gmail.com",
  password: "6967#6769",
  fullName: "Abir Biswas",
  role: "admin"
};

const state = {
  authResolved: false,
  currentUser: null,
  currentProfile: null,
  books: [],
  booksLoaded: false,
  booksError: "",
  users: [],
  usersLoaded: false,
  usersError: "",
  feedback: [],
  feedbackLoaded: false,
  feedbackError: ""
};

function isOwnerEmail(email) {
  return normalizeEmail(email) === normalizeEmail(OWNER_ACCOUNT.email);
}

function isOwnerUser(user = state.currentUser) {
  return Boolean(user && isOwnerEmail(user.email || ""));
}

function getUserRole(user = state.currentUser, profile = state.currentProfile) {
  if (isOwnerUser(user)) {
    return OWNER_ACCOUNT.role;
  }

  return String(profile?.role || "user");
}

function getPostLoginDestination(user = state.currentUser) {
  return isOwnerUser(user) ? "dashboard.html" : "user-dashboard.html";
}

async function signInOrCreateOwnerAccount() {
  try {
    const credential = await signInWithEmailAndPassword(auth, OWNER_ACCOUNT.email, OWNER_ACCOUNT.password);
    await updateProfile(credential.user, { displayName: OWNER_ACCOUNT.fullName });
    await ensureUserProfileDocument(credential.user, OWNER_ACCOUNT.fullName);
    return credential;
  } catch (error) {
    const code = String(error && typeof error === "object" && "code" in error ? error.code : "");
    if (!["auth/user-not-found", "auth/invalid-credential"].includes(code)) {
      throw error;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, OWNER_ACCOUNT.email, OWNER_ACCOUNT.password);
      await updateProfile(credential.user, { displayName: OWNER_ACCOUNT.fullName });
      await ensureUserProfileDocument(credential.user, OWNER_ACCOUNT.fullName);
      return credential;
    } catch (createError) {
      const createCode = String(
        createError && typeof createError === "object" && "code" in createError ? createError.code : ""
      );

      if (createCode === "auth/email-already-in-use") {
        const mismatchError = new Error("Owner account credentials do not match the Firebase Auth record.");
        mismatchError.code = "auth/owner-account-mismatch";
        throw mismatchError;
      }

      throw createError;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void initApp();
});

async function initApp() {
  console.info("[e-Zone] Initializing Firebase frontend");

  initPageLoader();
  initUserMenu();
  initPasswordToggles();
  bindGlobalActions();
  bindSignupForm();
  bindLoginForm();
  bindContactForm();
  bindBookFilters();
  bindFeedbackPage();
  bindAdminPage();
  bindDashboardShortcuts();

  renderAllPages();

  if (!isFirebaseConfigured()) {
    console.warn("[e-Zone] Firebase config is still using placeholders");
    renderConfigurationWarnings();
    hidePageLoader();
    return;
  }

  void loadBooks();

  onAuthStateChanged(auth, async (user) => {
    state.authResolved = true;
    state.currentUser = user;
    state.currentProfile = null;

    try {
      if (user) {
        console.info("[e-Zone] Authenticated user detected:", user.email || user.uid);
        state.currentProfile = await ensureUserProfileDocument(user);
        await Promise.all([loadUsers(), loadFeedback()]);
      } else {
        console.info("[e-Zone] No authenticated user");
        state.users = [];
        state.usersLoaded = false;
        state.usersError = "";
        state.feedback = [];
        state.feedbackLoaded = false;
        state.feedbackError = "";
      }
    } catch (error) {
      console.error("[e-Zone] Auth bootstrap failed", error);
    }

    syncAuthUi();
    renderAllPages();
    hidePageLoader();
  });
}

function initPageLoader() {
  window.setTimeout(() => {
    hidePageLoader();
  }, 2500);

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      hidePageLoader();
    }, 250);
  });
}

function hidePageLoader() {
  const loader = document.querySelector("[data-page-loader]");
  if (loader) {
    loader.classList.add("is-hidden");
  }

  document.body.classList.remove("loading-active");
}

function initUserMenu() {
  const trigger = document.querySelector("[data-user-menu-trigger]");
  const overlay = document.querySelector("[data-user-overlay]");
  const menu = document.querySelector("[data-user-menu]");

  if (!(trigger instanceof HTMLElement) || !(overlay instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
    return;
  }

  const open = () => {
    overlay.classList.add("open");
    menu.classList.add("open");
  };

  const close = () => {
    overlay.classList.remove("open");
    menu.classList.remove("open");
  };

  trigger.addEventListener("click", () => {
    if (menu.classList.contains("open")) {
      close();
      return;
    }

    open();
  });

  overlay.addEventListener("click", close);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("[data-user-menu-close]")) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });
}

function closeUserMenu() {
  const overlay = document.querySelector("[data-user-overlay]");
  const menu = document.querySelector("[data-user-menu]");
  overlay?.classList.remove("open");
  menu?.classList.remove("open");
}

function initPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    if (!(toggle instanceof HTMLInputElement) || toggle.dataset.bound === "1") {
      return;
    }

    toggle.dataset.bound = "1";

    toggle.addEventListener("change", () => {
      const selectors = String(toggle.getAttribute("data-target") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      selectors.forEach((selector) => {
        const input = document.querySelector(selector);
        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        input.type = toggle.checked ? "text" : "password";
      });
    });
  });
}

function bindGlobalActions() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const logoutButton = target.closest('[data-action="logout"]');
    if (logoutButton) {
      event.preventDefault();
      void handleLogout();
      return;
    }

    const customizeButton = target.closest('[data-open-modal="profile-customize"]');
    if (customizeButton) {
      event.preventDefault();
      window.location.href = getPostLoginDestination();
    }
  });
}

async function handleLogout() {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    await signOut(auth);
    console.info("[e-Zone] User signed out");
    closeUserMenu();
    window.location.href = "index.html";
  } catch (error) {
    console.error("[e-Zone] Logout failed", error);
  }
}

function bindSignupForm() {
  const form = document.getElementById("signup-form");
  const status = document.getElementById("signup-status");

  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js with your Firebase project keys first.", true);
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!name || !email || !password || !confirmPassword) {
      setStatus(status, "Please complete all signup fields.", true);
      return;
    }

    if (password.length < 8) {
      setStatus(status, "Password must be at least 8 characters long.", true);
      return;
    }

    if (password !== confirmPassword) {
      setStatus(status, "Passwords do not match.", true);
      return;
    }

    if (isOwnerEmail(email)) {
      setStatus(status, "This email is reserved for the fixed owner account.", true);
      return;
    }

    setStatus(status, "Creating your account...", false);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await ensureUserProfileDocument(credential.user, name);
      console.info("[e-Zone] Signup complete for", email);
      setStatus(status, "Account created successfully. Redirecting...", false);
      form.reset();
      window.location.href = getPostLoginDestination(credential.user);
    } catch (error) {
      console.error("[e-Zone] Signup failed", error);
      setStatus(status, humanizeAuthError(error), true);
    }
  });
}

function bindLoginForm() {
  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");

  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js with your Firebase project keys first.", true);
      return;
    }

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setStatus(status, "Email and password are required.", true);
      return;
    }

    if (isOwnerEmail(email) && password !== OWNER_ACCOUNT.password) {
      setStatus(status, "Use the fixed owner password for this reserved owner account.", true);
      return;
    }

    setStatus(status, "Signing you in...", false);

    try {
      const credential = isOwnerEmail(email)
        ? await signInOrCreateOwnerAccount()
        : await signInWithEmailAndPassword(auth, email, password);
      await ensureUserProfileDocument(credential.user);
      console.info("[e-Zone] Login complete for", email);
      setStatus(status, "Login successful. Redirecting...", false);
      form.reset();
      window.location.href = getPostLoginDestination(credential.user);
    } catch (error) {
      console.error("[e-Zone] Login failed", error);
      setStatus(status, humanizeAuthError(error), true);
    }
  });
}

function bindContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");

  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js before sending support messages.", true);
      return;
    }

    if (!state.currentUser) {
      setStatus(status, "Please login first. Support messages are now saved through Firebase.", true);
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus(status, "Please complete all contact fields.", true);
      return;
    }

    setStatus(status, "Sending your support message...", false);

    try {
      await submitFeedbackEntry({
        message: `[Contact] ${name}: ${message}`,
        source: "contact"
      });
      await loadFeedback();
      console.info("[e-Zone] Contact message stored for", email);
      setStatus(status, "Support message sent. It is now stored in Firestore.", false);
      form.reset();
      renderAllPages();
    } catch (error) {
      console.error("[e-Zone] Contact submit failed", error);
      setStatus(status, "Could not send your message right now.", true);
    }
  });
}

function bindBookFilters() {
  const form = document.getElementById("books-discovery-form");
  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  const render = () => {
    renderBooksDiscoveryResults();
  };

  form.addEventListener("input", render);
  form.addEventListener("change", render);

  const resetButton = form.querySelector("[data-books-filter-reset]");
  if (resetButton instanceof HTMLButtonElement) {
    resetButton.addEventListener("click", () => {
      form.reset();
      render();
    });
  }
}

function bindFeedbackPage() {
  const root = document.getElementById("feedback-app");
  if (!(root instanceof HTMLElement) || root.dataset.bound === "1") {
    return;
  }

  root.dataset.bound = "1";

  root.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "feedback-form") {
      return;
    }

    event.preventDefault();

    const status = document.getElementById("feedback-status");

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js before sending feedback.", true);
      return;
    }

    if (!state.currentUser) {
      setStatus(status, "Please login first to send feedback.", true);
      return;
    }

    const formData = new FormData(form);
    const message = String(formData.get("message") || "").trim();

    if (!message) {
      setStatus(status, "Please enter your feedback message.", true);
      return;
    }

    setStatus(status, "Submitting feedback...", false);

    try {
      await submitFeedbackEntry({
        message,
        source: "feedback"
      });
      await loadFeedback();
      console.info("[e-Zone] Feedback stored in Firestore");
      form.reset();
      renderFeedbackPage();
      setStatus(document.getElementById("feedback-status"), "Feedback sent successfully.", false);
      renderDashboardPage();
      renderLogsPage();
      renderUserDashboardPage();
      renderCommonMenuStats();
    } catch (error) {
      console.error("[e-Zone] Feedback submit failed", error);
      setStatus(status, "Could not submit feedback right now.", true);
    }
  });
}

function bindAdminPage() {
  const form = document.getElementById("admin-book-form");
  const uploadList = document.getElementById("admin-upload-list");
  const coverInput = document.getElementById("book-cover-pdf");

  if (coverInput instanceof HTMLInputElement) {
    coverInput.required = false;
  }

  if (uploadList instanceof HTMLElement && uploadList.dataset.bound !== "1") {
    uploadList.dataset.bound = "1";

    uploadList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const status = document.getElementById("admin-status");
      const deleteButton = target.closest("[data-delete-book]");
      const featuredButton = target.closest("[data-toggle-featured]");

      if (deleteButton) {
        if (!isOwnerUser()) {
          setStatus(status, "Only the owner account can remove books.", true);
          return;
        }

        const bookId = String(deleteButton.getAttribute("data-delete-book") || "");
        if (!bookId) {
          return;
        }

        try {
          await deleteBookById(bookId);
          setStatus(status, "Book removed from Firestore.", false);
        } catch (error) {
          console.error("[e-Zone] Could not delete book", error);
          setStatus(status, "Could not delete the selected book.", true);
        }
      }

      if (featuredButton) {
        if (!isOwnerUser()) {
          setStatus(status, "Only the owner account can edit featured books.", true);
          return;
        }

        const bookId = String(featuredButton.getAttribute("data-toggle-featured") || "");
        const book = state.books.find((entry) => entry.id === bookId);
        if (!book) {
          return;
        }

        try {
          await updateBookById(bookId, { featured: !book.featured });
          setStatus(status, "Featured status updated.", false);
        } catch (error) {
          console.error("[e-Zone] Could not update featured status", error);
          setStatus(status, "Could not update featured status.", true);
        }
      }
    });
  }

  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = document.getElementById("admin-status");

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js before uploading books.", true);
      return;
    }

    if (!state.currentUser) {
      setStatus(status, "Please login first to manage books.", true);
      return;
    }

    if (!isOwnerUser()) {
      setStatus(status, "Only the owner account can upload books.", true);
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const author = String(formData.get("author") || "").trim();
    const lang = String(formData.get("lang") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const description = String(formData.get("desc") || "").trim();
    const price = Number(formData.get("price") || 0);
    const featured = Boolean(formData.get("featured"));
    const rawLink = String(formData.get("bookLink") || "").trim();
    const link = normalizeLink(rawLink);
    const coverFile = formData.get("coverPdf");
    const qrFile = formData.get("qrImage");

    if (!title || !author || !lang || !category) {
      setStatus(status, "Please complete the required book fields.", true);
      return;
    }

    if (!CATEGORY_ORDER.includes(category)) {
      setStatus(status, "Please choose a valid book category.", true);
      return;
    }

    if (rawLink && !link) {
      setStatus(status, "Please enter a valid purchase link.", true);
      return;
    }

    let qrImageUrl = "";
    if (qrFile instanceof File && qrFile.size > 0) {
      if (!qrFile.type.startsWith("image/")) {
        setStatus(status, "QR code upload must be an image file.", true);
        return;
      }

      if (qrFile.size > 350000) {
        setStatus(status, "Please keep QR images under 350 KB for Firestore compatibility.", true);
        return;
      }

      qrImageUrl = await readFileAsDataUrl(qrFile);
    }

    if (!link && !qrImageUrl) {
      setStatus(status, "Provide at least one purchase source: link or QR image.", true);
      return;
    }

    const coverFileName = coverFile instanceof File && coverFile.size > 0 ? coverFile.name : "";

    setStatus(status, "Saving book to Firestore...", false);

    try {
      await addDoc(collection(db, "books"), {
        title,
        author,
        lang,
        category,
        description,
        price: Number.isFinite(price) ? price : 0,
        link,
        featured,
        coverFileName,
        qrImageUrl,
        coverUrl: createCoverDataUrl(title, category),
        createdAt: serverTimestamp(),
        createdBy: state.currentUser.uid
      });

      console.info("[e-Zone] Book saved to Firestore:", title);
      form.reset();
      await loadBooks();
      setStatus(status, "Book saved to Firestore successfully.", false);
    } catch (error) {
      console.error("[e-Zone] Book upload failed", error);
      setStatus(status, "Could not save the book to Firestore.", true);
    }
  });
}

function bindDashboardShortcuts() {
  const bindings = [
    ["dash-users-card", () => {
      window.location.href = "logs.html";
    }],
    ["dash-books-card", () => {
      window.location.href = "uploaded-books.html";
    }],
    ["dash-visits-card", () => {
      window.location.href = "feedback.html";
    }],
    ["dash-purchases-card", () => {
      window.location.href = "purchase-links.html";
    }]
  ];

  bindings.forEach(([id, action]) => {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement) || element.dataset.bound === "1") {
      return;
    }

    element.dataset.bound = "1";
    element.addEventListener("click", action);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
  });
}

async function ensureUserProfileDocument(user, preferredName = "") {
  const userRef = doc(db, "users", user.uid);
  const adminRef = doc(db, "admins", user.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.exists() ? snapshot.data() || {} : {};
  const owner = isOwnerEmail(user.email || "");
  const fallbackName = preferredName
    || String(existing.name || "").trim()
    || String(user.displayName || "").trim()
    || String(user.email || "Reader").split("@")[0];
  const resolvedName = owner ? OWNER_ACCOUNT.fullName : fallbackName;
  const resolvedRole = owner ? OWNER_ACCOUNT.role : String(existing.role || "user");

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: resolvedName,
      email: user.email || "",
      role: resolvedRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    const nextPatch = {};
    if (!existing.uid) {
      nextPatch.uid = user.uid;
    }
    if (!existing.name || owner) {
      nextPatch.name = resolvedName;
    }
    if (!existing.email && user.email) {
      nextPatch.email = user.email;
    }
    if (String(existing.role || "") !== resolvedRole) {
      nextPatch.role = resolvedRole;
    }
    nextPatch.updatedAt = serverTimestamp();

    if (Object.keys(nextPatch).length) {
      await setDoc(userRef, nextPatch, { merge: true });
    }
  }

  if (owner) {
    const adminSnapshot = await getDoc(adminRef);
    const adminExisting = adminSnapshot.exists() ? adminSnapshot.data() || {} : {};
    const adminPatch = {
      uid: user.uid,
      name: OWNER_ACCOUNT.fullName,
      email: OWNER_ACCOUNT.email,
      role: OWNER_ACCOUNT.role,
      updatedAt: serverTimestamp()
    };

    if (!adminSnapshot.exists()) {
      adminPatch.createdAt = serverTimestamp();
    } else if (!adminExisting.createdAt) {
      adminPatch.createdAt = serverTimestamp();
    }

    await setDoc(adminRef, adminPatch, { merge: true });
  }

  return {
    id: user.uid,
    uid: user.uid,
    name: resolvedName,
    email: String(existing.email || user.email || ""),
    role: resolvedRole,
    createdAt: safeDate(existing.createdAt) || safeDate(user.metadata.creationTime)
  };
}

async function loadBooks() {
  if (!isFirebaseConfigured()) {
    return [];
  }

  console.info("[e-Zone] Fetching books from Firestore");

  try {
    const snapshot = await getDocs(collection(db, "books"));
    state.books = snapshot.docs.map(mapBookDocument).sort(sortByNewest);
    state.booksError = "";
  } catch (error) {
    console.error("[e-Zone] Could not fetch books", error);
    state.books = [];
    state.booksError = "Could not load books from Firestore.";
  } finally {
    state.booksLoaded = true;
    renderAllPages();
  }

  return state.books;
}

async function loadUsers() {
  if (!isFirebaseConfigured() || !state.currentUser) {
    state.users = [];
    state.usersLoaded = false;
    state.usersError = "";
    return [];
  }

  if (!isOwnerUser()) {
    state.users = [];
    state.usersLoaded = true;
    state.usersError = "";
    return [];
  }

  console.info("[e-Zone] Fetching users from Firestore");

  try {
    const snapshot = await getDocs(collection(db, "users"));
    state.users = snapshot.docs.map(mapUserDocument).sort(sortByNewest);
    state.usersError = "";
  } catch (error) {
    console.error("[e-Zone] Could not fetch users", error);
    state.users = [];
    state.usersError = "Could not load users from Firestore.";
  } finally {
    state.usersLoaded = true;
  }

  return state.users;
}

async function loadFeedback() {
  if (!isFirebaseConfigured() || !state.currentUser) {
    state.feedback = [];
    state.feedbackLoaded = false;
    state.feedbackError = "";
    return [];
  }

  console.info("[e-Zone] Fetching feedback from Firestore");

  try {
    const snapshot = await getDocs(collection(db, "feedback"));
    state.feedback = snapshot.docs.map(mapFeedbackDocument).sort(sortByNewest);
    state.feedbackError = "";
  } catch (error) {
    console.error("[e-Zone] Could not fetch feedback", error);
    state.feedback = [];
    state.feedbackError = "Could not load feedback from Firestore.";
  } finally {
    state.feedbackLoaded = true;
  }

  return state.feedback;
}

async function submitFeedbackEntry({ message, source }) {
  if (!state.currentUser) {
    throw new Error("A logged-in user is required.");
  }

  await addDoc(collection(db, "feedback"), {
    message: String(message || "").trim(),
    userEmail: state.currentUser.email || "",
    userId: state.currentUser.uid,
    source: String(source || "feedback"),
    timestamp: serverTimestamp()
  });
}

async function updateBookById(bookId, patch) {
  if (!state.currentUser) {
    throw new Error("A logged-in user is required.");
  }

  if (!isOwnerUser()) {
    throw new Error("Only the owner account can update books.");
  }

  await updateDoc(doc(db, "books", bookId), patch);
  await loadBooks();
}

async function deleteBookById(bookId) {
  if (!state.currentUser) {
    throw new Error("A logged-in user is required.");
  }

  if (!isOwnerUser()) {
    throw new Error("Only the owner account can remove books.");
  }

  await deleteDoc(doc(db, "books", bookId));
  await loadBooks();
}

function renderAllPages() {
  syncAuthUi();
  renderHomeCategories();
  renderBooksPageCategories();
  renderBooksDiscoveryResults();
  renderCategoryPage();
  renderBookDetailPage();
  renderFeedbackPage();
  renderDashboardPage();
  renderUserDashboardPage();
  renderLogsPage();
  renderUploadedBooksPage();
  renderPurchaseLinksPage();
  renderAdminPage();
  renderCommonMenuStats();
}

function syncAuthUi() {
  const isLoggedIn = Boolean(state.currentUser);
  const isOwner = isOwnerUser();
  const name = getCurrentUserName();
  const email = state.currentUser?.email || "";
  const createdAt = state.currentProfile?.createdAt || safeDate(state.currentUser?.metadata?.creationTime);
  const memberSince = createdAt ? `Member since ${formatDateTime(createdAt)}` : "Member since --";
  const initials = avatarLetters(name || email || "EZ");

  document.querySelectorAll('[data-auth-link="login"], [data-auth-link="signup"]').forEach((link) => {
    link.classList.toggle("hidden", isLoggedIn);
  });

  document.querySelectorAll("[data-user-menu-trigger]").forEach((button) => {
    button.classList.toggle("hidden", !isLoggedIn);
  });

  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.classList.toggle("hidden", !isOwner);
  });

  setManyTexts("[data-profile-email]", email || "Not logged in");
  setManyTexts("[data-user-name]", name || "Guest User");
  setManyTexts("[data-user-email]", email || "Please login");
  setManyTexts("[data-user-role-label]", isOwner ? "Owner Access" : isLoggedIn ? "Authenticated Access" : "Guest Access");
  setManyTexts("[data-user-role-badge]", isOwner ? "Owner" : isLoggedIn ? "Member" : "Guest");
  setManyTexts("[data-user-menu-title]", isOwner ? "Owner Dashboard" : isLoggedIn ? "User Dashboard" : "Login Required");
  setManyTexts(
    "[data-user-menu-sub]",
    isOwner
      ? "Signed in with the fixed owner account for site management."
      : isLoggedIn
        ? "Firebase Auth is managing your active session."
        : "Sign in to unlock account-linked pages."
  );
  setManyTexts(
    "[data-user-bio]",
    isOwner
      ? "Owner controls are unlocked for Abir Biswas."
      : isLoggedIn
        ? "Connected through Firebase Authentication."
        : "Please sign in to continue."
  );
  setManyTexts("[data-user-meta]", memberSince);
  setManyTexts("[data-profile-avatar]", initials);
  setManyTexts("[data-user-avatar]", initials);

  document.body.classList.toggle("admin-mode", isOwner);

  document.querySelectorAll("[data-user-dashboard]").forEach((section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    section.style.display = isLoggedIn && !isOwner ? "grid" : "none";
  });

  document.querySelectorAll("[data-admin-dashboard]").forEach((section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    section.style.display = isOwner ? "grid" : "none";
  });

  if (!isLoggedIn) {
    closeUserMenu();
  }
}

function renderHomeCategories() {
  const root = document.getElementById("home-category-sections");
  if (!root) {
    return;
  }

  if (!isFirebaseConfigured()) {
    root.innerHTML = noticeMarkup("Add your Firebase config in firebase.js to load featured books.");
    return;
  }

  if (!state.booksLoaded) {
    root.innerHTML = loadingMarkup("Loading featured books from Firestore...");
    return;
  }

  if (state.booksError) {
    root.innerHTML = noticeMarkup(state.booksError);
    return;
  }

  const sections = getCategories().map((category) => {
    const featured = getFeaturedBooksByCategory(category, 3);
    const cards = featured.length
      ? featured.map((book) => renderBookCard(book)).join("")
      : "<article class='ebook-card placeholder-cell'><p>No books in this category yet.</p></article>";

    return `
      <section class="category-block">
        <h3 class="category-title">${escapeHtml(category)}</h3>
        <div class="cards-grid">
          ${cards}
        </div>
      </section>
    `;
  }).join("");

  root.innerHTML = sections;
  hydrateCovers(root);
}

function renderBooksPageCategories() {
  const root = document.getElementById("books-category-sections");
  if (!root) {
    return;
  }

  if (!isFirebaseConfigured()) {
    root.innerHTML = noticeMarkup("Add your Firebase config in firebase.js to load category shelves.");
    return;
  }

  if (!state.booksLoaded) {
    root.innerHTML = loadingMarkup("Loading category shelves from Firestore...");
    return;
  }

  if (state.booksError) {
    root.innerHTML = noticeMarkup(state.booksError);
    return;
  }

  const markup = getCategories().map((category) => {
    const books = getFeaturedBooksByCategory(category, 3);
    const bookCells = Array.from({ length: 3 }, (_, index) => {
      const book = books[index];
      if (!book) {
        return "<article class='ebook-card placeholder-cell'><p>No featured book in this slot yet.</p></article>";
      }

      return renderBookCard(book);
    }).join("");

    return `
      <section class="category-block">
        <h3 class="category-title">${escapeHtml(category)}</h3>
        <div class="cards-grid four">
          ${bookCells}
          <article class="show-all-cell">
            <span class="section-label">Category Action</span>
            <h4>Show All</h4>
            <p class="info-text">View the full ${escapeHtml(category)} collection.</p>
            <a class="btn btn-primary" href="category.html?category=${encodeURIComponent(categoryToSlug(category))}">Open Category</a>
          </article>
        </div>
      </section>
    `;
  }).join("");

  root.innerHTML = markup;
  hydrateCovers(root);
}

function renderBooksDiscoveryResults() {
  const summary = document.getElementById("books-discovery-summary");
  const root = document.getElementById("books-discovery-results");
  const form = document.getElementById("books-discovery-form");

  if (!summary || !root || !(form instanceof HTMLFormElement)) {
    return;
  }

  if (!isFirebaseConfigured()) {
    summary.textContent = "Update firebase.js to load books from Firestore.";
    root.innerHTML = noticeMarkup("Books will appear here after Firebase is configured.");
    return;
  }

  if (!state.booksLoaded) {
    summary.textContent = "Loading books...";
    root.innerHTML = loadingMarkup("Fetching books from Firestore...");
    return;
  }

  if (state.booksError) {
    summary.textContent = state.booksError;
    root.innerHTML = noticeMarkup(state.booksError);
    return;
  }

  const formData = new FormData(form);
  const books = filterBooks({
    query: String(formData.get("query") || ""),
    category: String(formData.get("category") || "all"),
    lang: String(formData.get("lang") || "all"),
    featured: String(formData.get("featured") || "all"),
    sortBy: String(formData.get("sortBy") || "newest")
  });

  if (!state.books.length) {
    summary.textContent = "No books are stored in Firestore yet.";
    root.innerHTML = noticeMarkup("Add your first book from admin.html after logging in.");
    return;
  }

  summary.textContent = `Found ${books.length} of ${state.books.length} books.`;
  root.innerHTML = books.length
    ? books.map((book) => renderBookCard(book)).join("")
    : "<article class='ebook-card placeholder-cell'><p>No books match the current search and filters.</p></article>";
  hydrateCovers(root);
}

function renderCategoryPage() {
  const title = document.getElementById("category-page-title");
  const root = document.getElementById("category-books-grid");

  if (!title || !root) {
    return;
  }

  if (!isFirebaseConfigured()) {
    root.innerHTML = noticeMarkup("Update firebase.js to load category books.");
    return;
  }

  if (!state.booksLoaded) {
    root.innerHTML = loadingMarkup("Loading category books from Firestore...");
    return;
  }

  if (state.booksError) {
    root.innerHTML = noticeMarkup(state.booksError);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = String(params.get("category") || "");
  const category = getCategories().find((entry) => categoryToSlug(entry) === slug) || getCategories()[0] || "Books";
  const books = state.books.filter((book) => book.category === category);

  title.textContent = `${category} Books`;

  root.innerHTML = books.length
    ? books.map((book) => renderBookCard(book)).join("")
    : "<article class='ebook-card placeholder-cell'><p>No books in this category yet.</p></article>";

  hydrateCovers(root);
}

function renderBookDetailPage() {
  const root = document.getElementById("book-detail-root");
  const relatedRoot = document.getElementById("related-books");

  if (!root) {
    return;
  }

  if (!isFirebaseConfigured()) {
    root.innerHTML = noticeMarkup("Update firebase.js to load book details.");
    if (relatedRoot) {
      relatedRoot.innerHTML = "";
    }
    return;
  }

  if (!state.booksLoaded) {
    root.innerHTML = loadingMarkup("Loading book details from Firestore...");
    if (relatedRoot) {
      relatedRoot.innerHTML = "";
    }
    return;
  }

  if (state.booksError) {
    root.innerHTML = noticeMarkup(state.booksError);
    if (relatedRoot) {
      relatedRoot.innerHTML = "";
    }
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedId = String(params.get("id") || "");
  const book = state.books.find((entry) => entry.id === requestedId) || state.books[0];

  if (!book) {
    root.innerHTML = noticeMarkup("No books are available in Firestore yet.");
    if (relatedRoot) {
      relatedRoot.innerHTML = "";
    }
    return;
  }

  const relatedBooks = state.books
    .filter((entry) => entry.category === book.category && entry.id !== book.id)
    .slice(0, 4);

  const buyButton = book.link
    ? `<a class="btn btn-primary" href="${escapeHtml(book.link)}" target="_blank" rel="noopener">Buy Now</a>`
    : "";

  const qrMarkup = book.qrImageUrl
    ? `
        <div class="qr-box">
          <p class="info-text">QR purchase source</p>
          <img class="qr-image" src="${escapeHtml(book.qrImageUrl)}" alt="QR code for ${escapeHtml(book.title)}">
        </div>
      `
    : "";

  root.innerHTML = `
    <div class="book-detail-layout">
      <article class="soft-panel book-detail-main">
        <div class="cover book-detail-cover" data-cover="${encodeURIComponent(book.coverPreview)}"></div>
        <div>
          <span class="section-label">${escapeHtml(book.category)}</span>
          <h2 style="margin:0.55rem 0 0.46rem;">${escapeHtml(book.title)}</h2>
          <p class="book-meta">By ${escapeHtml(book.author)} - ${escapeHtml(book.lang)}</p>
          <p class="book-text">${escapeHtml(book.description || "No description provided.")}</p>
          <p class="book-price" style="margin:0.45rem 0;">Price: ${formatPrice(book.price)}</p>
          <div class="inline-meta">
            ${book.featured ? '<span class="meta-pill">Featured</span>' : ""}
            ${book.link ? '<span class="meta-pill">Purchase Link Ready</span>' : ""}
            ${book.coverFileName ? `<span class="meta-pill">${escapeHtml(book.coverFileName)}</span>` : ""}
          </div>
          <div class="actions" style="margin-top:0.7rem;">
            <a class="btn btn-ghost" href="books.html">Back to Books</a>
            ${buyButton}
          </div>
        </div>
      </article>
      <aside class="soft-panel detail-side">
        <h3>Purchase Details</h3>
        <ol class="purchase-steps">
          <li>Open the purchase link or scan the QR code.</li>
          <li>Complete the payment on the linked source.</li>
          <li>Need help? Use the contact page while logged in.</li>
        </ol>
        ${book.link ? `<p style="margin-top:0.75rem;"><a href="${escapeHtml(book.link)}" target="_blank" rel="noopener">${escapeHtml(book.link)}</a></p>` : "<p class='info-text' style='margin-top:0.75rem;'>No external purchase link has been added yet.</p>"}
        ${qrMarkup}
      </aside>
    </div>
  `;

  if (relatedRoot) {
    relatedRoot.innerHTML = relatedBooks.length
      ? relatedBooks.map((entry) => renderBookCard(entry)).join("")
      : "<article class='ebook-card placeholder-cell'><p>No related books found.</p></article>";
    hydrateCovers(relatedRoot);
  }

  hydrateCovers(root);
}

function renderFeedbackPage() {
  const root = document.getElementById("feedback-app");
  if (!root) {
    return;
  }

  if (!isFirebaseConfigured()) {
    root.innerHTML = noticeMarkup("Update firebase.js to connect the feedback page to Firestore.");
    return;
  }

  if (!state.authResolved) {
    root.innerHTML = loadingMarkup("Checking your Firebase Authentication session...");
    return;
  }

  if (!state.currentUser) {
    root.innerHTML = `
      <article class="soft-panel feedback-shell">
        <div class="feedback-headline">
          <div>
            <span class="section-label">Feedback Center</span>
            <h2>Login Required</h2>
            <p class="info-text">Feedback is now stored directly in Firestore, so a Firebase Auth session is required before writing.</p>
          </div>
        </div>
        <div class="feedback-panel">
          <a class="btn btn-primary" href="login.html">Open Login</a>
        </div>
      </article>
    `;
    return;
  }

  const items = state.feedback.slice(0, 20);
  const feedbackList = !state.feedbackLoaded
    ? loadingMarkup("Loading feedback from Firestore...")
    : state.feedbackError
      ? noticeMarkup(state.feedbackError)
      : items.length
        ? `<div class="feedback-list">
            ${items.map((item) => `
              <article class="soft-panel feedback-card">
                <div class="feedback-head">
                  <p class="feedback-type">${escapeHtml(item.sourceLabel)}</p>
                  <p class="feedback-meta">${escapeHtml(item.userEmail || "Unknown user")} - ${formatDateTime(item.timestamp)}</p>
                </div>
                <p class="feedback-content">${escapeHtml(item.message)}</p>
              </article>
            `).join("")}
          </div>`
        : noticeMarkup("No feedback has been stored yet.");

  root.innerHTML = `
    <article class="soft-panel feedback-shell">
      <div class="feedback-headline">
        <div>
          <span class="section-label">Feedback Center</span>
          <h2>Community Feedback</h2>
          <p class="info-text">Every message submitted here is written straight to the Firestore <code>feedback</code> collection.</p>
        </div>
        <p class="status" id="feedback-status" aria-live="polite"></p>
      </div>
      <div class="feedback-panel">
        <form id="feedback-form" novalidate>
          <div class="field">
            <label for="feedback-message">Message</label>
            <textarea class="textarea" id="feedback-message" name="message" rows="5" maxlength="1200" placeholder="Share your feature request, bug report, or general feedback..." required></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Submit Feedback</button>
        </form>
        <div style="margin-top:1rem;">
          <h3 class="feedback-section-title">Recent Messages</h3>
          ${feedbackList}
        </div>
      </div>
    </article>
  `;
}

function renderDashboardPage() {
  const panel = document.getElementById("dashboard-panel");
  if (!panel) {
    return;
  }

  if (!toggleProtectedPanel("dashboard-panel", "dashboard-guard", { requireOwner: true })) {
    return;
  }

  const totalUsers = state.usersLoaded ? state.users.length : 0;
  const totalBooks = state.books.length;
  const totalFeatured = state.books.filter((book) => book.featured).length;
  const totalFeedback = state.feedbackLoaded ? state.feedback.length : 0;
  const totalLinkedBooks = state.books.filter((book) => Boolean(book.link)).length;

  setText("dash-total-users", String(totalUsers));
  setText("dash-total-books", String(totalBooks));
  setText("dash-total-featured", String(totalFeatured));
  setText("dash-total-visits", String(totalFeedback));
  setText("dash-total-purchases", String(totalLinkedBooks));
  setText("dash-total-time", "Live");
  setText("dash-total-uploads", String(totalBooks));

  const userSnapshot = document.getElementById("dash-user-snapshot");
  if (userSnapshot) {
    if (!state.usersLoaded) {
      userSnapshot.innerHTML = "<div class='menu-log-item'><span>Loading users...</span>Waiting for Firestore.</div>";
    } else if (state.usersError) {
      userSnapshot.innerHTML = `<div class='menu-log-item'><span>Users unavailable</span>${escapeHtml(state.usersError)}</div>`;
    } else if (!state.users.length) {
      userSnapshot.innerHTML = "<div class='menu-log-item'><span>No users yet</span>New signups will appear here.</div>";
    } else {
      userSnapshot.innerHTML = state.users.slice(0, 8).map((user) => `
        <div class="menu-log-item">
          <span>${escapeHtml(user.name || user.email || "User")}</span>
          ${escapeHtml(user.email || "No email")} - ${formatDateTime(user.createdAt)}
        </div>
      `).join("");
    }
  }

  const recentUploads = document.getElementById("dash-recent-uploads");
  if (recentUploads) {
    recentUploads.innerHTML = state.books.length
      ? state.books.slice(0, 10).map((book) => `
          <div class="menu-log-item">
            <span>${escapeHtml(book.title)}</span>
            ${escapeHtml(book.category)} - ${formatDateTime(book.createdAt)}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No uploads yet</span>Books saved in Firestore will appear here.</div>";
  }

  const globalActivity = document.getElementById("dash-global-activity");
  if (globalActivity) {
    const items = buildActivityItems().slice(0, 14);
    globalActivity.innerHTML = items.length
      ? items.map((item) => `
          <div class="menu-log-item">
            <span>${escapeHtml(item.title)}</span>
            ${escapeHtml(item.detail)} - ${formatDateTime(item.time)}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No activity yet</span>Book uploads and feedback will appear here.</div>";
  }
}

function renderUserDashboardPage() {
  const panel = document.getElementById("user-dashboard-panel");
  if (!panel) {
    return;
  }

  const ownerNote = document.getElementById("user-dashboard-owner-note");
  const guard = document.getElementById("user-dashboard-guard");

  if (!state.authResolved) {
    return;
  }

  const isLoggedIn = Boolean(state.currentUser);
  const owner = isOwnerUser();

  panel.classList.toggle("hidden", !isLoggedIn || owner);
  guard?.classList.toggle("hidden", isLoggedIn);
  ownerNote?.classList.toggle("hidden", !owner);

  if (!isLoggedIn || owner) {
    return;
  }

  const myFeedback = state.feedback.filter((item) => normalizeEmail(item.userEmail) === normalizeEmail(state.currentUser?.email || ""));
  const name = getCurrentUserName();
  const email = state.currentUser?.email || "-";
  const lastLogin = safeDate(state.currentUser?.metadata?.lastSignInTime);

  setText("user-dash-name", name);
  setText("user-dash-email", email);
  setText("user-dash-role", "Authenticated User");
  setText("user-dash-login-time", lastLogin ? formatDateTime(lastLogin) : "--");
  setText("user-dash-visits", String(myFeedback.length));
  setText("user-dash-visit-time", "Live");
  setText("user-dash-purchases", "0");
  setText("user-dash-reviews", String(myFeedback.length));

  const purchaseList = document.getElementById("user-dash-purchase-list");
  if (purchaseList) {
    purchaseList.innerHTML = "<div class='menu-log-item'><span>Purchase tracking removed</span>The JSON redirect log system was removed during the Firebase migration.</div>";
  }

  const activityList = document.getElementById("user-dash-activity-list");
  if (activityList) {
    activityList.innerHTML = myFeedback.length
      ? myFeedback.slice(0, 12).map((item) => `
          <div class="menu-log-item">
            <span>${escapeHtml(item.sourceLabel)}</span>
            ${escapeHtml(truncateText(item.message, 120))} - ${formatDateTime(item.timestamp)}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No activity yet</span>Your feedback messages will appear here.</div>";
  }

  const reviewList = document.getElementById("user-dash-review-list");
  if (reviewList) {
    reviewList.innerHTML = myFeedback.length
      ? myFeedback.slice(0, 20).map((item) => `
          <div class="menu-log-item">
            <span>${escapeHtml(item.sourceLabel)}</span>
            ${escapeHtml(item.message)}<br>
            ${formatDateTime(item.timestamp)}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No feedback yet</span>Messages you submit from the contact or feedback pages will appear here.</div>";
  }
}

function renderLogsPage() {
  const panel = document.getElementById("logs-panel");
  if (!panel) {
    return;
  }

  if (!toggleProtectedPanel("logs-panel", "logs-guard", { requireOwner: true })) {
    return;
  }

  const events = buildActivityItems();
  setText("logs-total-users", String(state.users.length));
  setText("logs-total-events", String(events.length));
  setText("logs-total-visits", String(state.feedback.length));
  setText("logs-total-purchases", String(state.books.filter((book) => Boolean(book.link)).length));

  const globalRoot = document.getElementById("logs-global-list");
  if (globalRoot) {
    globalRoot.innerHTML = events.length
      ? events.map((item) => `
          <div class="menu-log-item">
            <span>${escapeHtml(item.title)}</span>
            ${escapeHtml(item.detail)} - ${formatDateTime(item.time)}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No log events yet</span>Firestore activity will appear here.</div>";
  }

  const userGrid = document.getElementById("logs-user-grid");
  if (userGrid) {
    const feedbackByUser = groupFeedbackByUser();
    const users = state.users.length ? state.users : [mapUserFromCurrentSession()];

    userGrid.innerHTML = users.filter(Boolean).length
      ? users.filter(Boolean).map((user) => {
        const key = normalizeEmail(user.email || "");
        const entries = feedbackByUser[key] || [];
        return `
          <article class="soft-panel">
            <h3 style="margin-top:0;">${escapeHtml(user.name || user.email || "User")}</h3>
            <p class="info-text">Email: ${escapeHtml(user.email || "No email")} - Feedback entries: ${entries.length}</p>
            <div class="menu-log">
              ${entries.length
                ? entries.map((item) => `
                    <div class="menu-log-item">
                      <span>${escapeHtml(item.sourceLabel)}</span>
                      ${escapeHtml(truncateText(item.message, 110))} - ${formatDateTime(item.timestamp)}
                    </div>
                  `).join("")
                : "<div class='menu-log-item'><span>No activity</span>No Firestore feedback for this user yet.</div>"}
            </div>
          </article>
        `;
      }).join("")
      : "<article class='soft-panel'><p class='info-text'>No users are available yet.</p></article>";
  }
}

function renderUploadedBooksPage() {
  const panel = document.getElementById("uploaded-books-panel");
  if (!panel) {
    return;
  }

  if (!toggleProtectedPanel("uploaded-books-panel", "uploaded-books-guard", { requireOwner: true })) {
    return;
  }

  setText("uploaded-books-total", String(state.books.length));
  setText("uploaded-books-featured", String(state.books.filter((book) => book.featured).length));

  const root = document.getElementById("uploaded-books-list");
  if (!root) {
    return;
  }

  root.innerHTML = state.books.length
    ? state.books.map((book) => renderBookCard(book, { showMeta: true })).join("")
    : "<article class='ebook-card placeholder-cell'><p>No books are stored in Firestore yet.</p></article>";

  hydrateCovers(root);
}

function renderPurchaseLinksPage() {
  const panel = document.getElementById("purchase-links-panel");
  if (!panel) {
    return;
  }

  if (!toggleProtectedPanel("purchase-links-panel", "purchase-links-guard", { requireOwner: true })) {
    return;
  }

  const linkedBooks = state.books.filter((book) => Boolean(book.link));

  setText("purchase-links-total", "0");
  setText("purchase-links-users", String(state.users.length));
  setText("purchase-links-books", String(linkedBooks.length));

  const list = document.getElementById("purchase-links-list");
  if (!list) {
    return;
  }

  list.innerHTML = linkedBooks.length
    ? linkedBooks.map((book) => `
        <div class="menu-log-item purchase-link-item">
          <span>${escapeHtml(book.title)}</span>
          ${escapeHtml(book.category)}<br>
          <a href="${escapeHtml(book.link)}" target="_blank" rel="noopener">${escapeHtml(book.link)}</a><br>
          Redirect click logs are no longer stored now that the JSON backend has been removed.
        </div>
      `).join("")
    : "<div class='menu-log-item'><span>No purchase links yet</span>Books with external links will appear here.</div>";
}

function renderAdminPage() {
  const panel = document.getElementById("admin-panel");
  if (!panel) {
    return;
  }

  if (!toggleProtectedPanel("admin-panel", "admin-guard", { requireOwner: true })) {
    return;
  }

  renderAdminBookList();
}

function renderAdminBookList() {
  const root = document.getElementById("admin-upload-list");
  if (!root) {
    return;
  }

  if (!state.booksLoaded) {
    root.innerHTML = loadingMarkup("Loading books from Firestore...");
    return;
  }

  if (state.booksError) {
    root.innerHTML = noticeMarkup(state.booksError);
    return;
  }

  root.innerHTML = state.books.length
    ? state.books.map((book) => renderBookCard(book, {
        showDelete: true,
        showFeaturedToggle: true,
        showMeta: true
      })).join("")
    : "<article class='ebook-card placeholder-cell'><p>No books are stored in Firestore yet.</p></article>";

  hydrateCovers(root);
}

function renderCommonMenuStats() {
  const isLoggedIn = Boolean(state.currentUser);
  const myFeedback = isLoggedIn
    ? state.feedback.filter((item) => normalizeEmail(item.userEmail) === normalizeEmail(state.currentUser?.email || ""))
    : [];

  setManyTexts("[data-user-visits]", String(myFeedback.length));
  setManyTexts("[data-user-purchases]", "0");
  setManyTexts("[data-user-visit-time]", isLoggedIn ? "Live" : "0m");

  document.querySelectorAll("[data-user-purchase-list]").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    root.innerHTML = isLoggedIn
      ? "<div class='menu-log-item'><span>Purchase tracking removed</span>Legacy JSON purchase logs are no longer used.</div>"
      : "";
  });

  document.querySelectorAll("[data-user-timeline]").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    if (!isLoggedIn) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = myFeedback.length
      ? myFeedback.slice(0, 6).map((item) => `
          <div class="menu-log-item">
            <span>${escapeHtml(item.sourceLabel)}</span>
            ${escapeHtml(truncateText(item.message, 90))}
          </div>
        `).join("")
      : "<div class='menu-log-item'><span>No activity yet</span>Your feedback history will appear here.</div>";
  });

  setManyTexts("[data-admin-visits]", "0");
  setManyTexts("[data-admin-purchases]", "0");
  setManyTexts("[data-admin-uploads]", String(state.books.length));

  document.querySelectorAll("[data-admin-log-list]").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    root.innerHTML = "";
  });
}

function renderConfigurationWarnings() {
  const message = "Firebase is not configured yet. Open firebase.js and replace the placeholder values with your project's web app config.";

  [
    "signup-status",
    "login-status",
    "contact-status",
    "admin-status"
  ].forEach((id) => {
    setStatus(document.getElementById(id), message, true);
  });

  [
    "home-category-sections",
    "books-category-sections",
    "category-books-grid",
    "book-detail-root",
    "feedback-app",
    "admin-upload-list",
    "uploaded-books-list"
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = noticeMarkup(message);
    }
  });

  const summary = document.getElementById("books-discovery-summary");
  if (summary) {
    summary.textContent = message;
  }

  const results = document.getElementById("books-discovery-results");
  if (results) {
    results.innerHTML = noticeMarkup(message);
  }
}

function toggleProtectedPanel(panelId, guardId, options = {}) {
  if (!state.authResolved) {
    return false;
  }

  const panel = document.getElementById(panelId);
  const guard = document.getElementById(guardId);
  const requireOwner = Boolean(options.requireOwner);
  const isAllowed = requireOwner ? isOwnerUser() : Boolean(state.currentUser);

  if (panel) {
    panel.classList.toggle("hidden", !isAllowed);
  }

  if (guard) {
    guard.classList.toggle("hidden", isAllowed);
  }

  return isAllowed;
}

function getCategories() {
  const dynamicCategories = state.books
    .map((book) => String(book.category || "").trim())
    .filter(Boolean);

  return Array.from(new Set([...CATEGORY_ORDER, ...dynamicCategories]));
}

function getFeaturedBooksByCategory(category, count) {
  const booksInCategory = state.books.filter((book) => book.category === category);
  const featured = booksInCategory.filter((book) => book.featured);
  const list = featured.length ? featured : booksInCategory;
  return list.slice(0, count);
}

function filterBooks(filters) {
  const query = String(filters.query || "").trim().toLowerCase();
  const category = String(filters.category || "all");
  const lang = String(filters.lang || "all");
  const featured = String(filters.featured || "all");
  const sortBy = String(filters.sortBy || "newest");

  const filtered = state.books.filter((book) => {
    if (category !== "all" && book.category !== category) {
      return false;
    }

    if (lang !== "all" && book.lang !== lang) {
      return false;
    }

    if (featured === "featured" && !book.featured) {
      return false;
    }

    if (featured === "not_featured" && book.featured) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      book.title,
      book.author,
      book.description,
      book.category,
      book.lang
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });

  const sorters = {
    newest: (left, right) => sortByNewest(left, right),
    title_az: (left, right) => left.title.localeCompare(right.title),
    price_low: (left, right) => left.price - right.price,
    price_high: (left, right) => right.price - left.price,
    rating_high: (left, right) => sortByNewest(left, right)
  };

  return filtered.slice().sort(sorters[sortBy] || sorters.newest);
}

function renderBookCard(book, options = {}) {
  const encodedId = encodeURIComponent(book.id);
  const buyMarkup = book.link
    ? `<a class="btn btn-primary small" href="${escapeHtml(book.link)}" target="_blank" rel="noopener">Buy</a>`
    : `<a class="btn btn-primary small" href="book.html?id=${encodedId}">Open</a>`;

  const metaMarkup = options.showMeta
    ? `<div class="inline-meta">
        ${book.coverFileName ? `<span class="meta-pill">${escapeHtml(book.coverFileName)}</span>` : ""}
        ${book.link ? '<span class="meta-pill">Link Ready</span>' : ""}
        ${book.qrImageUrl ? '<span class="meta-pill">QR Ready</span>' : ""}
      </div>`
    : "";

  return `
    <article class="ebook-card">
      <div class="cover" data-cover="${encodeURIComponent(book.coverPreview)}"></div>
      <div class="book-card-head">
        <span class="section-label">${escapeHtml(book.category)}</span>
        ${book.featured ? '<span class="tag-pill">Featured</span>' : ""}
      </div>
      <h3>${escapeHtml(book.title)}</h3>
      <p class="book-meta">By ${escapeHtml(book.author)} - ${escapeHtml(book.lang)}</p>
      <p class="info-text">${escapeHtml(truncateText(book.description || "No description provided.", 120))}</p>
      <p class="book-price">${formatPrice(book.price)}</p>
      ${metaMarkup}
      <div class="actions">
        <a class="btn btn-ghost small" href="book.html?id=${encodedId}">Details</a>
        ${buyMarkup}
      </div>
      ${options.showFeaturedToggle ? `<button class="btn btn-ghost small" type="button" data-toggle-featured="${escapeHtml(book.id)}">${book.featured ? "Unmark Featured" : "Mark Featured"}</button>` : ""}
      ${options.showDelete ? `<button class="btn btn-danger-action small" type="button" data-delete-book="${escapeHtml(book.id)}">Delete</button>` : ""}
    </article>
  `;
}

function mapBookDocument(snapshot) {
  const data = snapshot.data() || {};
  const title = String(data.title || "Untitled Book");
  const category = String(data.category || "Books");
  const coverPreview = String(data.coverUrl || "").trim() || createCoverDataUrl(title, category);

  return {
    id: snapshot.id,
    title,
    author: String(data.author || "Unknown Author"),
    lang: String(data.lang || "Bangla"),
    category,
    description: String(data.description || data.desc || ""),
    price: Number(data.price || 0),
    link: String(data.link || data.rokomariUrl || ""),
    featured: Boolean(data.featured),
    coverFileName: String(data.coverFileName || data.coverPdfName || ""),
    qrImageUrl: String(data.qrImageUrl || data.qrImageData || ""),
    createdAt: safeDate(data.createdAt) || new Date(),
    coverPreview
  };
}

function mapUserDocument(snapshot) {
  const data = snapshot.data() || {};

  return {
    id: snapshot.id,
    uid: String(data.uid || snapshot.id),
    name: String(data.name || "Reader"),
    email: String(data.email || ""),
    role: String(data.role || "user"),
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function mapFeedbackDocument(snapshot) {
  const data = snapshot.data() || {};
  const source = String(data.source || "feedback");

  return {
    id: snapshot.id,
    message: String(data.message || ""),
    userEmail: String(data.userEmail || ""),
    source,
    sourceLabel: source === "contact" ? "Contact Message" : "Feedback",
    timestamp: safeDate(data.timestamp) || new Date()
  };
}

function mapUserFromCurrentSession() {
  if (!state.currentUser) {
    return null;
  }

  return {
    id: state.currentUser.uid,
    uid: state.currentUser.uid,
    name: getCurrentUserName(),
    email: state.currentUser.email || "",
    role: getUserRole(),
    createdAt: safeDate(state.currentUser.metadata.creationTime) || new Date()
  };
}

function buildActivityItems() {
  const feedbackItems = state.feedback.map((item) => ({
    title: `${item.sourceLabel} - ${item.userEmail || "Unknown user"}`,
    detail: truncateText(item.message, 100),
    time: item.timestamp
  }));

  const bookItems = state.books.map((book) => ({
    title: `Book Added - ${book.title}`,
    detail: `${book.category}${book.link ? " - Purchase link ready" : ""}`,
    time: book.createdAt
  }));

  return [...feedbackItems, ...bookItems].sort((left, right) => {
    return getTimeValue(right.time) - getTimeValue(left.time);
  });
}

function groupFeedbackByUser() {
  return state.feedback.reduce((groups, item) => {
    const key = normalizeEmail(item.userEmail || "");
    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(item);
    return groups;
  }, {});
}

function getCurrentUserName() {
  return String(
    state.currentProfile?.name
    || state.currentUser?.displayName
    || state.currentUser?.email?.split("@")[0]
    || "Reader"
  ).trim();
}

function noticeMarkup(message) {
  return `
    <article class="soft-panel">
      <p class="info-text">${escapeHtml(message)}</p>
    </article>
  `;
}

function loadingMarkup(message) {
  return `
    <article class="soft-panel">
      <p class="info-text">${escapeHtml(message)}</p>
    </article>
  `;
}

function setStatus(element, message, isError) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.textContent = String(message || "");
  element.style.color = isError ? "var(--danger)" : "var(--primary)";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value || "");
  }
}

function setManyTexts(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = String(value || "");
  });
}

function hydrateCovers(scope) {
  const root = scope || document;

  root.querySelectorAll("[data-cover]").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const raw = String(element.getAttribute("data-cover") || "");
    const decoded = decodeURIComponent(raw);
    element.style.backgroundImage = `url("${decoded.replaceAll("\"", "%22")}")`;
  });
}

function categoryToSlug(category) {
  return String(category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLink(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.toString();
  } catch (error) {
    return "";
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function avatarLetters(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "EZ";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value, length) {
  const text = String(value || "").trim();
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, Math.max(0, length - 3)).trimEnd()}...`;
}

function formatPrice(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Price on request";
  }

  return `BDT ${amount.toLocaleString()}`;
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function getTimeValue(value) {
  const next = safeDate(value);
  return next ? next.getTime() : 0;
}

function sortByNewest(left, right) {
  return getTimeValue(right.createdAt || right.timestamp) - getTimeValue(left.createdAt || left.timestamp);
}

function formatDateTime(value) {
  const date = safeDate(value);
  if (!date) {
    return "--";
  }

  return date.toLocaleString();
}

function createCoverDataUrl(title, category) {
  const safeTitle = escapeHtml(title);
  const safeCategory = escapeHtml(category);
  const initials = escapeHtml(avatarLetters(title));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs>
        <linearGradient id="coverGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#15193b"/>
          <stop offset="50%" stop-color="#5940ff"/>
          <stop offset="100%" stop-color="#ff6f91"/>
        </linearGradient>
      </defs>
      <rect width="600" height="900" rx="40" fill="url(#coverGradient)"/>
      <circle cx="470" cy="160" r="92" fill="rgba(255,255,255,0.12)"/>
      <circle cx="120" cy="720" r="132" fill="rgba(255,255,255,0.08)"/>
      <text x="70" y="110" fill="#ffffff" font-size="30" font-family="Arial, sans-serif">${safeCategory}</text>
      <text x="70" y="330" fill="#ffffff" font-size="90" font-weight="700" font-family="Arial, sans-serif">${initials}</text>
      <foreignObject x="70" y="390" width="460" height="280">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff;font-family:Arial,sans-serif;font-size:48px;line-height:1.18;font-weight:700;">
          ${safeTitle}
        </div>
      </foreignObject>
      <text x="70" y="830" fill="#f6f7ff" font-size="24" font-family="Arial, sans-serif">e-Zone</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function humanizeAuthError(error) {
  const code = String(error && typeof error === "object" && "code" in error ? error.code : "");

  const messages = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/owner-account-mismatch": "This reserved owner email already exists in Firebase with a different password. Update it in the Firebase console to 6967#6769 if you want this exact owner login to work.",
    "auth/missing-password": "Password is required.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
  };

  return messages[code] || "The authentication request could not be completed.";
}
