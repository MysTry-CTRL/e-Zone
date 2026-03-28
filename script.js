import { auth, db, isFirebaseConfigured } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
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

const PAGE_LABELS = {
  "index.html": "Home",
  "books.html": "Books",
  "book.html": "Book Detail",
  "category.html": "Category",
  "about.html": "About",
  "contact.html": "Contact",
  "signup.html": "Sign Up",
  "login.html": "Login",
  "feedback.html": "Feedback",
  "dashboard.html": "Owner Dashboard",
  "admin.html": "Upload Books",
  "logs.html": "Logs",
  "uploaded-books.html": "Uploaded Books",
  "purchase-links.html": "Purchase Links",
  "user-dashboard.html": "User Dashboard"
};

const SOCIAL_PROVIDER_LABELS = {
  google: "Google",
  apple: "Apple",
  microsoft: "Microsoft",
  facebook: "Facebook",
  github: "GitHub"
};

const OWNER_ACCOUNT = {
  email: "abirxxdbrine2024@gmail.com",
  password: "#youtuber#69#",
  fullName: "Abir Biswas",
  role: "admin"
};

const STORAGE_KEYS = {
  profilePreferences: "ezone_profile_prefs_v1",
  theme: "ezone_theme_v1",
  socialProvider: "ezone_social_provider_v1"
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
  feedbackError: "",
  ownerUpdates: [],
  ownerUpdatesLoaded: false,
  ownerUpdatesError: "",
  uiPreferences: null,
  dashboardUserFilter: "all"
};

let mobileNoticeTimer = 0;
let hoverHelpTimer = 0;
let activeLinkPreviewElement = null;

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

function isAuthScreen() {
  const page = getCurrentPageFileName();
  return page === "login.html" || page === "signup.html";
}

function getAuthStatusElement() {
  return document.getElementById("login-status") || document.getElementById("signup-status");
}

function rememberPendingSocialProvider(providerName) {
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.socialProvider, String(providerName || ""));
  } catch (error) {
    console.warn("[e-Zone] Could not store pending social provider", error);
  }
}

function readPendingSocialProvider() {
  try {
    return String(window.sessionStorage.getItem(STORAGE_KEYS.socialProvider) || "");
  } catch (error) {
    console.warn("[e-Zone] Could not read pending social provider", error);
    return "";
  }
}

function clearPendingSocialProvider() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.socialProvider);
  } catch (error) {
    console.warn("[e-Zone] Could not clear pending social provider", error);
  }
}

function shouldDisableModalUi() {
  const smallViewport = window.matchMedia("(max-width: 760px)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const mobileAgent = /android|iphone|ipad|ipod|mobile/i.test(String(window.navigator.userAgent || ""));
  return smallViewport || (mobileAgent && coarsePointer);
}

function getDefaultUiPreferences() {
  return {
    theme: "light",
    customBio: "",
    avatarImage: "",
    hideEmail: false,
    hideActivity: false,
    hidePurchases: false,
    profilePrivate: false,
    reduceMotion: false
  };
}

function normalizeUiPreferences(value = {}) {
  const next = value && typeof value === "object" ? value : {};

  return {
    theme: ["light", "dark"].includes(String(next.theme || "")) ? String(next.theme || "") : "light",
    customBio: String(next.customBio || "").trim().slice(0, 220),
    avatarImage: String(next.avatarImage || ""),
    hideEmail: Boolean(next.hideEmail),
    hideActivity: Boolean(next.hideActivity),
    hidePurchases: Boolean(next.hidePurchases),
    profilePrivate: Boolean(next.profilePrivate),
    reduceMotion: Boolean(next.reduceMotion)
  };
}

function readUiPreferences() {
  const defaults = getDefaultUiPreferences();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.profilePreferences);
    const parsed = raw ? JSON.parse(raw) : {};
    const theme = window.localStorage.getItem(STORAGE_KEYS.theme);
    return normalizeUiPreferences({
      ...defaults,
      ...parsed,
      theme: theme === "dark" ? "dark" : "light"
    });
  } catch (error) {
    console.warn("[e-Zone] Could not load local profile preferences", error);
    return defaults;
  }
}

function loadUiPreferences() {
  state.uiPreferences = readUiPreferences();
  applyUiPreferences();
}

function persistUiPreferences() {
  const next = normalizeUiPreferences(state.uiPreferences);
  state.uiPreferences = next;

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.profilePreferences,
      JSON.stringify({
        customBio: next.customBio,
        avatarImage: next.avatarImage,
        hideEmail: next.hideEmail,
        hideActivity: next.hideActivity,
        hidePurchases: next.hidePurchases,
        profilePrivate: next.profilePrivate,
        reduceMotion: next.reduceMotion
      })
    );

    window.localStorage.setItem(STORAGE_KEYS.theme, next.theme);
  } catch (error) {
    console.warn("[e-Zone] Could not save local profile preferences", error);
  }

  applyUiPreferences();
}

function applyUiPreferences() {
  const prefs = normalizeUiPreferences(state.uiPreferences);
  state.uiPreferences = prefs;

  document.documentElement.setAttribute("data-theme", prefs.theme);

  document.body.classList.toggle("hide-email", prefs.hideEmail);
  document.body.classList.toggle("hide-activity", prefs.hideActivity);
  document.body.classList.toggle("hide-purchases", prefs.hidePurchases);
  document.body.classList.toggle("profile-private", prefs.profilePrivate);
  document.body.classList.toggle("reduce-motion", prefs.reduceMotion);

  applyAvatarPreferenceToTargets();
}

function getResolvedUserBio(defaultBio = "") {
  const customBio = String(state.uiPreferences?.customBio || "").trim();
  return customBio || defaultBio;
}

function applyAvatarPreferenceToTargets() {
  const image = String(state.uiPreferences?.avatarImage || "");

  document.querySelectorAll("[data-profile-avatar], [data-user-avatar]").forEach((element) => {
    const fallbackText = String(element.textContent || "").trim();
    applyAvatarPreferenceToElement(element, image, fallbackText);
  });

  const preview = document.querySelector("[data-customize-avatar-preview]");
  if (preview instanceof HTMLElement) {
    const fallbackText = avatarLetters(getCurrentUserName() || state.currentUser?.email || "EZ");
    applyAvatarPreferenceToElement(preview, getCustomizeAvatarDraft(), fallbackText);
  }
}

function applyAvatarPreferenceToElement(element, image, fallbackText = "") {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (image) {
    const encoded = image.replaceAll("\"", "%22");
    element.classList.add("has-image");
    element.style.backgroundImage = `url("${encoded}")`;
    element.textContent = "";
    return;
  }

  element.classList.remove("has-image");
  element.style.backgroundImage = "";
  if (fallbackText) {
    element.textContent = fallbackText;
  }
}

function buildGlobalModalMarkup() {
  return `
    <div class="modal" data-modal-root="profile-customize" aria-hidden="true">
      <div class="modal-content modal-customize glass" role="dialog" aria-modal="true" aria-labelledby="profile-customize-title">
        <button class="modal-close" type="button" data-modal-close="profile-customize" aria-label="Close customize profile modal">&times;</button>
        <p class="section-label">Control Center</p>
        <h3 id="profile-customize-title">Customize Profile</h3>
        <p class="info-text">Restore the custom control-center modal and keep your preferences saved in this browser.</p>
        <div class="customize-grid">
          <section class="customize-section">
            <h4>Profile Preview</h4>
            <div class="avatar-upload-row">
              <span class="profile-avatar customize-avatar-preview" data-customize-avatar-preview>EZ</span>
              <div class="avatar-upload-actions">
                <label class="btn btn-ghost avatar-upload-btn">
                  Upload Avatar
                  <input class="native-file-hidden" type="file" accept="image/*" data-customize-avatar-input>
                </label>
                <button class="btn btn-ghost" type="button" data-customize-avatar-clear>Remove</button>
              </div>
            </div>
            <div class="field">
              <label for="customize-bio">Custom Bio</label>
              <textarea class="textarea" id="customize-bio" rows="4" maxlength="220" data-customize-bio placeholder="Add a short note for your control center..."></textarea>
            </div>
            <p class="control-center-note">These settings are local to this browser and do not overwrite Firebase account data.</p>
          </section>
          <section class="customize-section">
            <h4>Appearance</h4>
            <div class="field">
              <label for="customize-theme">Theme</label>
              <select class="select" id="customize-theme" data-customize-theme>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <label class="toggle-field">
              <input type="checkbox" data-customize-reduce-motion>
              Reduce motion across the interface
            </label>
          </section>
          <section class="customize-section">
            <h4>Privacy</h4>
            <label class="toggle-field">
              <input type="checkbox" data-customize-hide-email>
              Hide your email in the control center
            </label>
            <label class="toggle-field">
              <input type="checkbox" data-customize-hide-activity>
              Hide activity timeline blocks
            </label>
            <label class="toggle-field">
              <input type="checkbox" data-customize-hide-purchases>
              Hide purchase history areas
            </label>
            <label class="toggle-field">
              <input type="checkbox" data-customize-profile-private>
              Hide member metadata
            </label>
          </section>
          <section class="customize-section">
            <h4>Quick Notes</h4>
            <div class="menu-log-item">
              <span>Restored Modal Flow</span>
              Your custom modal styling is back and now runs from the shared site script.
            </div>
            <div class="menu-log-item">
              <span>Safe Storage</span>
              Preferences are stored locally so they survive page reloads without changing Firestore records.
            </div>
          </section>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-customize-reset>Reset</button>
          <button class="btn btn-primary" type="button" data-customize-save>Save Changes</button>
        </div>
      </div>
    </div>

    <div class="modal" data-modal-root="dashboard-users" aria-hidden="true">
      <div class="modal-content modal-dashboard-users glass" role="dialog" aria-modal="true" aria-labelledby="dashboard-users-title">
        <button class="modal-close" type="button" data-modal-close="dashboard-users" aria-label="Close registered users modal">&times;</button>
        <p class="section-label">Owner Console</p>
        <h3 id="dashboard-users-title">Registered Users & Credentials</h3>
        <p class="info-text">Review synced user records and the reserved owner account from one restored dashboard modal.</p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" data-owner-users-toggle="all">All Users</button>
          <button class="btn btn-ghost" type="button" data-owner-users-toggle="recent">Recent</button>
          <button class="btn btn-ghost" type="button" data-owner-users-toggle="owner">Owner</button>
        </div>
        <div class="cards-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
          <article class="soft-panel owner-credential-item">
            <div class="owner-credentials-head">
              <h4 style="margin:0;">Fixed Owner Account</h4>
              <span class="role-badge">Owner</span>
            </div>
            <p class="info-text">Reserved login route for the main site owner.</p>
            <code data-owner-account-email></code>
            <code data-owner-account-password></code>
            <code data-owner-account-name></code>
          </article>
          <article class="soft-panel owner-credentials-section">
            <div class="owner-credentials-head">
              <h4 style="margin:0;">Synced Profiles</h4>
              <p class="control-center-note" data-owner-users-summary></p>
            </div>
            <div class="menu-log owner-credentials-log" data-owner-users-log></div>
          </article>
        </div>
      </div>
    </div>

    <div class="modal" data-modal-root="owner-updates" aria-hidden="true">
      <div class="modal-content modal-owner-updates glass" role="dialog" aria-modal="true" aria-labelledby="owner-updates-title">
        <button class="modal-close" type="button" data-modal-close="owner-updates" aria-label="Close owner updates modal">&times;</button>
        <p class="section-label">Notifications</p>
        <h3 id="owner-updates-title">Recent Owner Updates</h3>
        <p class="info-text">Latest announcements published by the owner from the dashboard.</p>
        <div class="menu-log owner-updates-log" data-owner-updates-log></div>
      </div>
    </div>

    <div class="modal" data-modal-root="popup" aria-hidden="true">
      <div class="modal-content modal-popup glass" data-kind="info" role="dialog" aria-modal="true" aria-labelledby="popup-modal-title">
        <button class="modal-close" type="button" data-modal-close="popup" aria-label="Close popup modal">&times;</button>
        <p class="section-label popup-label" data-popup-label>Notice</p>
        <h3 id="popup-modal-title" data-popup-title>Update</h3>
        <p class="popup-message" data-popup-message></p>
        <div class="modal-actions popup-actions">
          <button class="btn btn-primary" type="button" data-popup-ack>Close</button>
        </div>
      </div>
    </div>

    <div class="hover-help-modal" data-hover-help-modal data-kind="action" aria-live="polite">
      <p class="hover-help-label" data-hover-help-label>Quick Tip</p>
      <p class="hover-help-message" data-hover-help-message></p>
    </div>
  `;
}

function ensureGlobalUiShells() {
  if (!(document.body instanceof HTMLElement)) {
    return;
  }

  if (document.querySelector("[data-modal-root='profile-customize']")) {
    return;
  }

  document.body.insertAdjacentHTML("beforeend", buildGlobalModalMarkup());
}

function ensureMobileNoticeRoot() {
  let root = document.querySelector("[data-mobile-inline-notice]");
  if (root instanceof HTMLElement) {
    return root;
  }

  const header = document.querySelector(".site-header");
  if (!(header instanceof HTMLElement) || !(header.parentElement instanceof HTMLElement)) {
    return null;
  }

  header.insertAdjacentHTML(
    "afterend",
    `
      <div class="mobile-inline-notice soft-panel glass hidden" data-mobile-inline-notice aria-live="polite">
        <div class="mobile-inline-notice-head">
          <p class="section-label" data-mobile-inline-notice-label>Notice</p>
          <button class="menu-close" type="button" data-mobile-inline-notice-close aria-label="Close mobile notice">&times;</button>
        </div>
        <p class="info-text mobile-inline-notice-message" data-mobile-inline-notice-message></p>
      </div>
    `
  );

  root = document.querySelector("[data-mobile-inline-notice]");
  return root instanceof HTMLElement ? root : null;
}

function showMobileInlineNotice({
  label = "Notice",
  message = ""
}) {
  const root = ensureMobileNoticeRoot();
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const labelNode = root.querySelector("[data-mobile-inline-notice-label]");
  const messageNode = root.querySelector("[data-mobile-inline-notice-message]");

  if (labelNode instanceof HTMLElement) {
    labelNode.textContent = label;
  }

  if (messageNode instanceof HTMLElement) {
    messageNode.textContent = message;
  }

  root.classList.remove("hidden");
  root.classList.add("show");

  window.clearTimeout(mobileNoticeTimer);
  mobileNoticeTimer = window.setTimeout(() => {
    root.classList.remove("show");
    root.classList.add("hidden");
  }, 4200);
}

function isPortraitOrientation() {
  return window.matchMedia("(orientation: portrait)").matches;
}

function isLandscapeOrientation() {
  return window.matchMedia("(orientation: landscape)").matches;
}

function isExplicitMobileOrTabletUserAgent() {
  const userAgent = String(window.navigator.userAgent || "");
  const platform = String(window.navigator.userAgentData?.platform || window.navigator.platform || "");
  const isIpadOsDesktopAgent = /mac/i.test(platform) && Number(window.navigator.maxTouchPoints || 0) > 1;
  return /android|iphone|ipad|ipod|mobile|tablet|kindle|silk|playbook/i.test(userAgent) || isIpadOsDesktopAgent;
}

function isDesktopClassPlatform() {
  const userAgent = String(window.navigator.userAgent || "");
  const platform = String(window.navigator.userAgentData?.platform || window.navigator.platform || "");
  return /win|mac|linux|x11|cros/i.test(platform) || /\bwindows nt\b|\bmacintosh\b|\bx11\b|\bcros\b|\blinux x86_64\b/i.test(userAgent);
}

function isTouchResponsiveDevice() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const touchEnabled = "ontouchstart" in window || Number(window.navigator.maxTouchPoints || 0) > 0;

  if (isExplicitMobileOrTabletUserAgent()) {
    return true;
  }

  if (isDesktopClassPlatform()) {
    return false;
  }

  return coarsePointer || (touchEnabled && !finePointer);
}

function getTouchViewportShortSide() {
  const screenWidth = Number(window.screen?.width || 0);
  const screenHeight = Number(window.screen?.height || 0);
  if (screenWidth > 0 && screenHeight > 0) {
    return Math.min(screenWidth, screenHeight);
  }

  const values = [
    Number(window.innerWidth || 0),
    Number(window.innerHeight || 0)
  ].filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? Math.min(...values) : 0;
}

function getTouchViewportLongSide() {
  const screenWidth = Number(window.screen?.width || 0);
  const screenHeight = Number(window.screen?.height || 0);
  if (screenWidth > 0 && screenHeight > 0) {
    return Math.max(screenWidth, screenHeight);
  }

  const values = [
    Number(window.innerWidth || 0),
    Number(window.innerHeight || 0)
  ].filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? Math.max(...values) : 0;
}

function getTouchLayoutProfile() {
  if (!isTouchResponsiveDevice()) {
    return "desktop";
  }

  const shortSide = getTouchViewportShortSide();
  const longSide = getTouchViewportLongSide();

  if (shortSide <= 760) {
    return "phone";
  }

  if (shortSide >= 834 && shortSide <= 1100 && longSide >= 1100) {
    return "tablet-large";
  }

  if (shortSide >= 600 && shortSide <= 920 && longSide >= 900) {
    return "tablet-compact";
  }

  return "desktop";
}

function shouldUseCompactHeader() {
  const profile = getTouchLayoutProfile();

  if (profile === "phone") {
    return isPortraitOrientation();
  }

  if (profile === "tablet-compact") {
    return true;
  }

  if (profile === "tablet-large") {
    return isPortraitOrientation();
  }

  return false;
}

function shouldLockPhoneLandscape() {
  return getTouchLayoutProfile() === "phone" && isLandscapeOrientation();
}

function initMobileBrandMenu() {
  ensureMobileBrandMenuShell();
  ensureMobileBrandMenuTrigger();
  updateMobileHeaderMode();

  if (!(document.body instanceof HTMLElement) || document.body.dataset.mobileBrandMenuBound === "1") {
    return;
  }

  document.body.dataset.mobileBrandMenuBound = "1";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("[data-mobile-brand-toggle]")) {
      event.preventDefault();
      toggleMobileBrandMenu();
      return;
    }

    if (target.closest("[data-mobile-nav-overlay], [data-mobile-nav-close]")) {
      event.preventDefault();
      closeMobileBrandMenu();
      return;
    }

    if (target.closest("[data-mobile-nav-link]")) {
      closeMobileBrandMenu();
      return;
    }

    const actionButton = target.closest("[data-mobile-nav-action]");
    if (actionButton instanceof HTMLElement) {
      event.preventDefault();
      handleMobileNavAction(String(actionButton.getAttribute("data-mobile-nav-action") || ""));
      closeMobileBrandMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileBrandMenu();
    }
  });

  window.addEventListener("resize", updateMobileHeaderMode, { passive: true });
  window.addEventListener("orientationchange", updateMobileHeaderMode);
}

function ensureMobileBrandMenuShell() {
  if (!(document.body instanceof HTMLElement)) {
    return;
  }

  if (!document.querySelector("[data-mobile-nav-overlay]")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="mobile-nav-overlay" data-mobile-nav-overlay aria-hidden="true"></div>
        <aside class="mobile-nav-drawer glass" data-mobile-nav-drawer aria-hidden="true" aria-label="Compact navigation drawer">
          <div class="mobile-nav-head">
            <div class="mobile-nav-copy">
              <p class="section-label">Quick Menu</p>
              <h3>Explore e-Zone</h3>
              <p class="control-center-note" data-mobile-nav-note>Topbar links are mirrored here for compact touch layouts.</p>
            </div>
            <button class="menu-close" type="button" data-mobile-nav-close aria-label="Close compact menu">&times;</button>
          </div>
          <nav class="mobile-nav-links" data-mobile-nav-links aria-label="Compact navigation links"></nav>
        </aside>
        <div class="mobile-orientation-lock" data-mobile-orientation-lock aria-hidden="true">
          <div class="mobile-orientation-lock-card glass">
            <span class="brand-icon mobile-orientation-lock-icon" aria-hidden="true"></span>
            <p class="section-label">Phone Portrait Only</p>
            <h3>Rotate your phone back upright</h3>
            <p class="info-text">e-Zone keeps phone browsing in portrait mode only, so this layout pauses in landscape.</p>
          </div>
        </div>
      `
    );
  }
}

function ensureMobileBrandMenuTrigger() {
  const header = document.querySelector(".site-header .nav-shell");
  const brand = document.querySelector(".site-header .brand");

  if (!(header instanceof HTMLElement) || !(brand instanceof HTMLElement)) {
    return;
  }

  brand.classList.add("brand-home-link");

  let button = header.querySelector("[data-mobile-brand-toggle]");
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-brand-toggle";
    button.setAttribute("data-mobile-brand-toggle", "");
    button.setAttribute("aria-controls", "ezone-mobile-nav");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");
    button.title = "Open navigation menu";
    button.innerHTML = `<span class="brand-icon" aria-hidden="true"></span>`;
    header.insertBefore(button, brand);
  }

  const drawer = document.querySelector("[data-mobile-nav-drawer]");
  if (drawer instanceof HTMLElement) {
    drawer.id = "ezone-mobile-nav";
  }
}

function updateMobileHeaderMode() {
  ensureMobileBrandMenuShell();
  ensureMobileBrandMenuTrigger();
  renderMobileBrandMenu();

  if (!(document.body instanceof HTMLElement)) {
    return;
  }

  const layoutProfile = getTouchLayoutProfile();
  const useCompactHeader = shouldUseCompactHeader();
  const lockPhoneLandscape = shouldLockPhoneLandscape();

  document.body.classList.toggle("use-compact-header", useCompactHeader);
  document.body.classList.toggle("lock-phone-landscape", lockPhoneLandscape);
  document.body.classList.toggle("device-phone", layoutProfile === "phone");
  document.body.classList.toggle("device-tablet-compact", layoutProfile === "tablet-compact");
  document.body.classList.toggle("device-tablet-large", layoutProfile === "tablet-large");
  document.body.dataset.touchLayoutProfile = layoutProfile;

  const lock = document.querySelector("[data-mobile-orientation-lock]");
  if (lock instanceof HTMLElement) {
    lock.classList.toggle("open", lockPhoneLandscape);
    lock.setAttribute("aria-hidden", lockPhoneLandscape ? "false" : "true");
  }

  if (!useCompactHeader) {
    closeMobileBrandMenu();
  }
}

function renderMobileBrandMenu() {
  ensureMobileBrandMenuShell();
  ensureMobileBrandMenuTrigger();

  const linksRoot = document.querySelector("[data-mobile-nav-links]");
  const note = document.querySelector("[data-mobile-nav-note]");

  if (!(linksRoot instanceof HTMLElement)) {
    return;
  }

  const links = getMobileBrandMenuLinks();
  const currentFile = getCurrentPageFileName();
  const currentLabel = getCurrentPageLabel();
  const layoutProfile = getTouchLayoutProfile();

  if (note instanceof HTMLElement) {
    if (layoutProfile === "tablet-compact") {
      note.textContent = `Viewing ${currentLabel}. This compact tablet menu stays active in both portrait and landscape.`;
    } else if (layoutProfile === "tablet-large") {
      note.textContent = `Viewing ${currentLabel}. This larger-tablet menu stays compact in portrait and returns to the full desktop header in landscape.`;
    } else {
      note.textContent = `Viewing ${currentLabel}. On phones, this compact menu stays active in portrait mode.`;
    }
  }

  linksRoot.innerHTML = links.length
    ? links.map((item) => {
      if (item.kind === "action") {
        return `
          <button class="mobile-nav-link mobile-nav-action-link" type="button" data-mobile-nav-action="${escapeHtml(item.action || "")}">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.note)}</span>
          </button>
        `;
      }

      const targetFile = getFileNameFromHref(item.href || "");
      const isCurrent = targetFile === currentFile;

      return `
        <a class="mobile-nav-link${isCurrent ? " is-current" : ""}" href="${escapeHtml(item.href || "#")}" data-mobile-nav-link>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(isCurrent ? "Current page" : item.note)}</span>
        </a>
      `;
    }).join("")
    : `
      <article class="soft-panel mobile-nav-empty">
        <p class="info-text">No topbar links are available here right now.</p>
      </article>
    `;
}

function getMobileBrandMenuLinks() {
  const isLoggedIn = Boolean(state.currentUser);
  const anchors = [
    ...Array.from(document.querySelectorAll(".main-nav a")),
    ...Array.from(document.querySelectorAll(".control-center a")).filter((link) => {
      return link instanceof HTMLAnchorElement && !link.classList.contains("hidden");
    })
  ];
  const seen = new Set();

  const items = anchors.reduce((result, link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return result;
    }

    const href = String(link.getAttribute("href") || "").trim();
    const label = String(link.textContent || "").trim();

    if (!href || !label) {
      return result;
    }

    const key = `${getFileNameFromHref(href)}::${label.toLowerCase()}`;
    if (seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push({
      href,
      label,
      kind: "link",
      note: getMobileBrandMenuLinkNote(label)
    });
    return result;
  }, []);

  if (!isLoggedIn) {
    const fallbackAuthLinks = [
      { href: "login.html", label: "Login" },
      { href: "signup.html", label: "Sign Up" }
    ];

    fallbackAuthLinks.forEach((item) => {
      const key = `${getFileNameFromHref(item.href)}::${item.label.toLowerCase()}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      items.push({
        ...item,
        kind: "link",
        note: getMobileBrandMenuLinkNote(item.label)
      });
    });
    items.push({
      kind: "action",
      action: "notifications",
      label: "Notifications",
      note: state.ownerUpdatesLoaded
        ? `${state.ownerUpdates.length} recent owner updates`
        : "Loading owner updates..."
    });
    return items;
  }

  const actionItems = [
    {
      kind: "action",
      action: "account",
      label: "My Account",
      note: "Open Action Center and account controls."
    },
    {
      kind: "action",
      action: "theme",
      label: "Theme Toggle",
      note: `Switch to ${getResolvedThemeMode() === "dark" ? "light" : "dark"} mode.`
    },
    {
      kind: "action",
      action: "notifications",
      label: "Notifications",
      note: state.ownerUpdatesLoaded
        ? `${state.ownerUpdates.length} recent owner updates`
        : "Loading owner updates..."
    }
  ];

  return [...items, ...actionItems];
}

function getMobileBrandMenuLinkNote(label) {
  const normalized = String(label || "").trim().toLowerCase();

  if (normalized === "home") {
    return "Return to the homepage.";
  }

  if (normalized === "books") {
    return "Browse the live book collection.";
  }

  if (normalized === "about") {
    return "Read more about e-Zone.";
  }

  if (normalized === "contact") {
    return "Reach support and contact options.";
  }

  if (normalized === "login") {
    return "Sign in to your account.";
  }

  if (normalized === "sign up") {
    return "Create a new account.";
  }

  if (normalized === "my account") {
    return "Open your account control center.";
  }

  if (normalized === "theme toggle") {
    return "Switch between light and dark mode.";
  }

  if (normalized === "notifications") {
    return "Read the latest owner announcements.";
  }

  return `Open ${label}.`;
}

function handleMobileNavAction(action = "") {
  const key = String(action || "").trim().toLowerCase();

  if (key === "account") {
    const trigger = document.querySelector("[data-user-menu-trigger]");
    if (trigger instanceof HTMLButtonElement && !trigger.classList.contains("hidden")) {
      trigger.click();
    } else {
      showMobileInlineNotice({
        label: "Login Required",
        message: "Please login first to open your account center."
      });
    }
    return;
  }

  if (key === "theme") {
    if (!state.currentUser) {
      showMobileInlineNotice({
        label: "Login Required",
        message: "Theme switching becomes available after login."
      });
      return;
    }
    cycleActionCenterTheme();
    return;
  }

  if (key === "notifications") {
    openModal("owner-updates");
  }
}

function toggleMobileBrandMenu() {
  const drawer = document.querySelector("[data-mobile-nav-drawer]");
  if (!(drawer instanceof HTMLElement) || !shouldUseCompactHeader()) {
    return;
  }

  if (drawer.classList.contains("open")) {
    closeMobileBrandMenu();
    return;
  }

  openMobileBrandMenu();
}

function openMobileBrandMenu() {
  if (!shouldUseCompactHeader()) {
    return;
  }

  const overlay = document.querySelector("[data-mobile-nav-overlay]");
  const drawer = document.querySelector("[data-mobile-nav-drawer]");
  const trigger = document.querySelector("[data-mobile-brand-toggle]");

  if (!(overlay instanceof HTMLElement) || !(drawer instanceof HTMLElement)) {
    return;
  }

  closeUserMenu();
  document.body.classList.add("mobile-brand-menu-open");
  overlay.classList.add("open");
  drawer.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  drawer.setAttribute("aria-hidden", "false");

  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("aria-expanded", "true");
  }
}

function closeMobileBrandMenu() {
  const overlay = document.querySelector("[data-mobile-nav-overlay]");
  const drawer = document.querySelector("[data-mobile-nav-drawer]");
  const trigger = document.querySelector("[data-mobile-brand-toggle]");

  overlay?.classList.remove("open");
  drawer?.classList.remove("open");
  overlay?.setAttribute("aria-hidden", "true");
  drawer?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("mobile-brand-menu-open");

  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("aria-expanded", "false");
  }
}

function initCustomModals() {
  ensureGlobalUiShells();

  if (!(document.body instanceof HTMLElement)) {
    return;
  }

  if (document.body.dataset.customModalBound === "1") {
    renderRestoredModals();
    return;
  }

  document.body.dataset.customModalBound = "1";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const mobileNoticeClose = target.closest("[data-mobile-inline-notice-close]");
    if (mobileNoticeClose) {
      event.preventDefault();
      const root = document.querySelector("[data-mobile-inline-notice]");
      if (root instanceof HTMLElement) {
        root.classList.remove("show");
        root.classList.add("hidden");
      }
      return;
    }

    const closeButton = target.closest("[data-modal-close]");
    if (closeButton) {
      event.preventDefault();
      closeModal(String(closeButton.getAttribute("data-modal-close") || ""));
      return;
    }

    if (target instanceof HTMLElement && target.matches(".modal")) {
      closeModal(String(target.getAttribute("data-modal-root") || ""));
      return;
    }

    const saveButton = target.closest("[data-customize-save]");
    if (saveButton) {
      event.preventDefault();
      void saveProfileCustomizeModal();
      return;
    }

    const resetButton = target.closest("[data-customize-reset]");
    if (resetButton) {
      event.preventDefault();
      resetProfileCustomizeModal();
      return;
    }

    const clearAvatarButton = target.closest("[data-customize-avatar-clear]");
    if (clearAvatarButton) {
      event.preventDefault();
      const modal = document.querySelector("[data-modal-root='profile-customize']");
      if (modal instanceof HTMLElement) {
        modal.dataset.dirty = "1";
      }
      setCustomizeAvatarDraft("");
      showHoverHelp({
        kind: "action",
        label: "Avatar Removed",
        message: "The avatar preview has been cleared. Save changes to apply it."
      });
      return;
    }

    const toggleButton = target.closest("[data-owner-users-toggle]");
    if (toggleButton) {
      event.preventDefault();
      state.dashboardUserFilter = String(toggleButton.getAttribute("data-owner-users-toggle") || "all");
      renderDashboardUsersModal();
      return;
    }

    const popupAck = target.closest("[data-popup-ack]");
    if (popupAck) {
      event.preventDefault();
      closeModal("popup");
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-customize-avatar-input]")) {
      const modal = target instanceof Element ? target.closest("[data-modal-root='profile-customize']") : null;
      if (modal instanceof HTMLElement) {
        modal.dataset.dirty = "1";
      }
      return;
    }

    const [file] = Array.from(target.files || []);
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      target.value = "";
      showPopupModal({
        kind: "warning",
        label: "Avatar Upload",
        title: "Image Required",
        message: "Please choose an image file for the profile avatar preview."
      });
      return;
    }

    if (file.size > 220000) {
      target.value = "";
      showHoverHelp({
        kind: "required",
        label: "Avatar Too Large",
        message: "Keep the avatar under 220 KB so it can be stored locally without breaking the custom modal."
      });
      return;
    }

    void readFileAsDataUrl(file)
      .then((image) => {
        const modal = document.querySelector("[data-modal-root='profile-customize']");
        if (modal instanceof HTMLElement) {
          modal.dataset.dirty = "1";
        }
        setCustomizeAvatarDraft(image);
        target.value = "";
      })
      .catch((error) => {
        console.error("[e-Zone] Avatar preview load failed", error);
        showPopupModal({
          kind: "danger",
          label: "Avatar Upload",
          title: "Upload Failed",
          message: "The selected avatar image could not be loaded."
        });
      });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  window.addEventListener("resize", () => {
    if (shouldDisableModalUi()) {
      closeModal();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const modal = target.closest("[data-modal-root='profile-customize']");
    if (modal instanceof HTMLElement) {
      modal.dataset.dirty = "1";
    }
  });

  renderRestoredModals();
}

function renderRestoredModals() {
  updateProfileCustomizeModal();
  renderDashboardUsersModal();
  renderOwnerUpdatesModal();
}

function updateProfileCustomizeModal() {
  const modal = document.querySelector("[data-modal-root='profile-customize']");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  if (modal.classList.contains("show") && modal.dataset.dirty === "1") {
    const preview = modal.querySelector("[data-customize-avatar-preview]");
    if (preview instanceof HTMLElement) {
      const fallbackText = avatarLetters(getCurrentUserName() || state.currentUser?.email || "EZ");
      applyAvatarPreferenceToElement(preview, getCustomizeAvatarDraft(), fallbackText);
    }
    return;
  }

  const prefs = normalizeUiPreferences(state.uiPreferences);
  state.uiPreferences = prefs;

  if (!("avatarImage" in modal.dataset)) {
    modal.dataset.avatarImage = prefs.avatarImage;
  }

  const bioField = modal.querySelector("[data-customize-bio]");
  const themeField = modal.querySelector("[data-customize-theme]");
  const hideEmailField = modal.querySelector("[data-customize-hide-email]");
  const hideActivityField = modal.querySelector("[data-customize-hide-activity]");
  const hidePurchasesField = modal.querySelector("[data-customize-hide-purchases]");
  const profilePrivateField = modal.querySelector("[data-customize-profile-private]");
  const reduceMotionField = modal.querySelector("[data-customize-reduce-motion]");
  const preview = modal.querySelector("[data-customize-avatar-preview]");

  if (bioField instanceof HTMLTextAreaElement) {
    bioField.value = prefs.customBio;
  }

  if (themeField instanceof HTMLSelectElement) {
    themeField.value = prefs.theme;
  }

  if (hideEmailField instanceof HTMLInputElement) {
    hideEmailField.checked = prefs.hideEmail;
  }

  if (hideActivityField instanceof HTMLInputElement) {
    hideActivityField.checked = prefs.hideActivity;
  }

  if (hidePurchasesField instanceof HTMLInputElement) {
    hidePurchasesField.checked = prefs.hidePurchases;
  }

  if (profilePrivateField instanceof HTMLInputElement) {
    profilePrivateField.checked = prefs.profilePrivate;
  }

  if (reduceMotionField instanceof HTMLInputElement) {
    reduceMotionField.checked = prefs.reduceMotion;
  }

  if (preview instanceof HTMLElement) {
    const fallbackText = avatarLetters(getCurrentUserName() || state.currentUser?.email || "EZ");
    applyAvatarPreferenceToElement(preview, getCustomizeAvatarDraft(), fallbackText);
  }
}

function getCustomizeAvatarDraft() {
  const modal = document.querySelector("[data-modal-root='profile-customize']");
  if (!(modal instanceof HTMLElement)) {
    return String(state.uiPreferences?.avatarImage || "");
  }

  return String(modal.dataset.avatarImage || state.uiPreferences?.avatarImage || "");
}

function setCustomizeAvatarDraft(image = "") {
  const modal = document.querySelector("[data-modal-root='profile-customize']");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  modal.dataset.avatarImage = String(image || "");
  updateProfileCustomizeModal();
}

async function saveProfileCustomizeModal() {
  const modal = document.querySelector("[data-modal-root='profile-customize']");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const bioField = modal.querySelector("[data-customize-bio]");
  const themeField = modal.querySelector("[data-customize-theme]");
  const hideEmailField = modal.querySelector("[data-customize-hide-email]");
  const hideActivityField = modal.querySelector("[data-customize-hide-activity]");
  const hidePurchasesField = modal.querySelector("[data-customize-hide-purchases]");
  const profilePrivateField = modal.querySelector("[data-customize-profile-private]");
  const reduceMotionField = modal.querySelector("[data-customize-reduce-motion]");

  state.uiPreferences = normalizeUiPreferences({
    theme: themeField instanceof HTMLSelectElement ? themeField.value : "light",
    customBio: bioField instanceof HTMLTextAreaElement ? bioField.value : "",
    avatarImage: getCustomizeAvatarDraft(),
    hideEmail: hideEmailField instanceof HTMLInputElement ? hideEmailField.checked : false,
    hideActivity: hideActivityField instanceof HTMLInputElement ? hideActivityField.checked : false,
    hidePurchases: hidePurchasesField instanceof HTMLInputElement ? hidePurchasesField.checked : false,
    profilePrivate: profilePrivateField instanceof HTMLInputElement ? profilePrivateField.checked : false,
    reduceMotion: reduceMotionField instanceof HTMLInputElement ? reduceMotionField.checked : false
  });

  persistUiPreferences();
  modal.dataset.dirty = "0";
  syncAuthUi();
  renderCommonMenuStats();
  updateProfileCustomizeModal();
  closeModal("profile-customize");

  showPopupModal({
    kind: "success",
    label: "Profile Saved",
    title: "Custom Modal Preferences Restored",
    message: "Your profile appearance and privacy settings have been saved locally for this browser."
  });
}

function resetProfileCustomizeModal() {
  state.uiPreferences = getDefaultUiPreferences();
  setCustomizeAvatarDraft("");
  const modal = document.querySelector("[data-modal-root='profile-customize']");
  if (modal instanceof HTMLElement) {
    modal.dataset.dirty = "0";
  }
  updateProfileCustomizeModal();
  showHoverHelp({
    kind: "action",
    label: "Defaults Loaded",
    message: "Default settings are ready. Press Save Changes to apply the reset."
  });
}

function getDashboardModalUsers() {
  const allUsers = state.users.length ? state.users.slice() : [];
  const currentSessionUser = mapUserFromCurrentSession();

  if (!allUsers.length && currentSessionUser) {
    allUsers.push(currentSessionUser);
  }

  const filter = String(state.dashboardUserFilter || "all");

  if (filter === "owner") {
    return allUsers.filter((user) => isOwnerEmail(user.email || ""));
  }

  if (filter === "recent") {
    return allUsers.slice().sort(sortByNewest).slice(0, 8);
  }

  return allUsers.slice().sort(sortByNewest);
}

function renderDashboardUsersModal() {
  const modal = document.querySelector("[data-modal-root='dashboard-users']");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const emailNode = modal.querySelector("[data-owner-account-email]");
  const passwordNode = modal.querySelector("[data-owner-account-password]");
  const nameNode = modal.querySelector("[data-owner-account-name]");
  const summaryNode = modal.querySelector("[data-owner-users-summary]");
  const logNode = modal.querySelector("[data-owner-users-log]");

  if (emailNode instanceof HTMLElement) {
    emailNode.textContent = `Email: ${OWNER_ACCOUNT.email}`;
  }

  if (passwordNode instanceof HTMLElement) {
    passwordNode.textContent = `Password: ${OWNER_ACCOUNT.password}`;
  }

  if (nameNode instanceof HTMLElement) {
    nameNode.textContent = `Full Name: ${OWNER_ACCOUNT.fullName}`;
  }

  modal.querySelectorAll("[data-owner-users-toggle]").forEach((button) => {
    const active = String(button.getAttribute("data-owner-users-toggle") || "") === String(state.dashboardUserFilter || "all");
    button.classList.toggle("is-active", active);
  });

  if (!(logNode instanceof HTMLElement)) {
    return;
  }

  if (!state.authResolved) {
    logNode.innerHTML = "<div class='menu-log-item'><span>Loading session...</span>Waiting for Firebase Authentication.</div>";
    return;
  }

  if (!state.currentUser || !isOwnerUser()) {
    logNode.innerHTML = "<div class='menu-log-item'><span>Owner access required</span>This restored modal is visible only to the fixed owner account.</div>";
    return;
  }

  const allUsers = state.users.slice().sort(sortByNewest);
  const visibleUsers = getDashboardModalUsers();

  if (summaryNode instanceof HTMLElement) {
    summaryNode.textContent = `${visibleUsers.length} shown / ${allUsers.length || visibleUsers.length} total`;
  }

  logNode.innerHTML = visibleUsers.length
    ? visibleUsers.map((user) => `
        <div class="menu-log-item">
          <span>${escapeHtml(user.name || user.email || "User")}</span>
          ${escapeHtml(user.email || "No email")}<br>
          Role: ${escapeHtml(String(user.role || "user"))} - Joined ${formatDateTime(user.createdAt)}
        </div>
      `).join("")
    : "<div class='menu-log-item'><span>No users yet</span>Registered users will appear here once Firestore sync completes.</div>";
}

function renderOwnerUpdatesModal() {
  const modal = document.querySelector("[data-modal-root='owner-updates']");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const logNode = modal.querySelector("[data-owner-updates-log]");
  if (!(logNode instanceof HTMLElement)) {
    return;
  }

  if (!state.ownerUpdatesLoaded) {
    logNode.innerHTML = "<div class='menu-log-item'><span>Loading updates...</span>Syncing owner announcements from Firestore.</div>";
    return;
  }

  if (state.ownerUpdatesError) {
    logNode.innerHTML = `<div class='menu-log-item'><span>Updates unavailable</span>${escapeHtml(state.ownerUpdatesError)}</div>`;
    return;
  }

  const updates = state.ownerUpdates.slice(0, 20);

  logNode.innerHTML = updates.length
    ? updates.map((item) => `
        <div class="menu-log-item">
          <span>${escapeHtml(item.title || "Owner Update")}</span>
          <p class="feedback-content">${escapeHtml(item.message || "")}</p>
          <small>${escapeHtml(item.ownerName || "Owner")} - ${formatDateTime(item.createdAt)}</small>
        </div>
      `).join("")
    : "<div class='menu-log-item'><span>No updates yet</span>Owner announcements will appear here as soon as they are posted.</div>";
}

function openModal(name) {
  const modal = document.querySelector(`[data-modal-root="${name}"]`);
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  if (shouldDisableModalUi()) {
    if (name === "profile-customize") {
      window.location.href = state.currentUser ? getPostLoginDestination() : "login.html";
      return;
    }

    if (name === "dashboard-users") {
      window.location.href = isOwnerUser() ? "logs.html" : "login.html";
      return;
    }

    if (name === "owner-updates") {
      const previewLines = state.ownerUpdates.slice(0, 4).map((item, index) => {
        const title = item.title || `Update ${index + 1}`;
        return `${index + 1}. ${title} - ${truncateText(item.message || "", 70)}`;
      });
      showMobileInlineNotice({
        label: "Owner Updates",
        message: previewLines.length
          ? previewLines.join("\n")
          : "No owner updates are available yet."
      });
      return;
    }

    return;
  }

  if (name === "profile-customize" && !state.currentUser) {
    showPopupModal({
      kind: "warning",
      label: "Login Required",
      title: "Sign In First",
      message: "Log in first to use the restored profile customization modal."
    });
    return;
  }

  if (name === "dashboard-users" && !isOwnerUser()) {
    showPopupModal({
      kind: "danger",
      label: "Owner Only",
      title: "Access Restricted",
      message: "This modal is available only to the reserved owner account."
    });
    return;
  }

  if (name === "profile-customize") {
    modal.dataset.dirty = "0";
    modal.dataset.avatarImage = String(state.uiPreferences?.avatarImage || "");
  }

  closeModal();
  renderRestoredModals();
  closeUserMenu();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const focusTarget = modal.querySelector("button, input, textarea, select");
  if (focusTarget instanceof HTMLElement) {
    window.setTimeout(() => {
      focusTarget.focus();
    }, 20);
  }
}

function closeModal(name = "") {
  const openModals = name
    ? Array.from(document.querySelectorAll(`[data-modal-root="${name}"]`))
    : Array.from(document.querySelectorAll(".modal.show"));

  openModals.forEach((modal) => {
    if (!(modal instanceof HTMLElement)) {
      return;
    }

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });

  if (!document.querySelector(".modal.show")) {
    document.body.classList.remove("modal-open");
  }
}

function showPopupModal({
  kind = "info",
  label = "Notice",
  title = "Update",
  message = "",
  actionLabel = "Close"
}) {
  if (shouldDisableModalUi()) {
    showMobileInlineNotice({
      label,
      message: title === label || !title ? message : `${title}: ${message}`
    });
    return;
  }

  ensureGlobalUiShells();

  const popup = document.querySelector("[data-modal-root='popup']");
  if (!(popup instanceof HTMLElement)) {
    return;
  }

  const content = popup.querySelector(".modal-popup");
  const labelNode = popup.querySelector("[data-popup-label]");
  const titleNode = popup.querySelector("[data-popup-title]");
  const messageNode = popup.querySelector("[data-popup-message]");
  const actionNode = popup.querySelector("[data-popup-ack]");

  if (content instanceof HTMLElement) {
    content.setAttribute("data-kind", kind);
  }

  if (labelNode instanceof HTMLElement) {
    labelNode.textContent = label;
  }

  if (titleNode instanceof HTMLElement) {
    titleNode.textContent = title;
  }

  if (messageNode instanceof HTMLElement) {
    messageNode.textContent = message;
  }

  if (actionNode instanceof HTMLElement) {
    actionNode.textContent = actionLabel;
  }

  openModal("popup");
}

function hideHoverHelp() {
  const root = document.querySelector("[data-hover-help-modal]");
  window.clearTimeout(hoverHelpTimer);

  if (root instanceof HTMLElement) {
    root.classList.remove("show");
  }
}

function showHoverHelp(options = {}) {
  const normalized = typeof options === "string"
    ? { kind: "action", label: "Quick Tip", message: options }
    : options && typeof options === "object"
      ? options
      : {};
  const {
    kind = "action",
    label = "Quick Tip",
    message = "",
    persist = false
  } = normalized;

  if (shouldDisableModalUi()) {
    if (persist) {
      return;
    }

    showMobileInlineNotice({
      label,
      message
    });
    return;
  }

  const root = document.querySelector("[data-hover-help-modal]");
  const labelNode = document.querySelector("[data-hover-help-label]");
  const messageNode = document.querySelector("[data-hover-help-message]");

  if (!(root instanceof HTMLElement) || !(labelNode instanceof HTMLElement) || !(messageNode instanceof HTMLElement)) {
    return;
  }

  root.setAttribute("data-kind", kind);
  labelNode.textContent = label;
  messageNode.textContent = message;
  root.classList.add("show");

  window.clearTimeout(hoverHelpTimer);

  if (!persist) {
    hoverHelpTimer = window.setTimeout(() => {
      root.classList.remove("show");
    }, 3200);
  }
}

function buildFallbackProfile(user, preferredName = "") {
  const fallbackName = preferredName
    || String(user?.displayName || "").trim()
    || String(user?.email || "Reader").split("@")[0];
  const owner = isOwnerEmail(user?.email || "");

  return {
    id: user?.uid || "",
    uid: user?.uid || "",
    name: owner ? OWNER_ACCOUNT.fullName : fallbackName,
    email: String(user?.email || ""),
    role: owner ? OWNER_ACCOUNT.role : "user",
    createdAt: safeDate(user?.metadata?.creationTime) || new Date(),
    syncError: true
  };
}

async function syncCurrentUserProfile(user, preferredName = "") {
  try {
    return await ensureUserProfileDocument(user, preferredName);
  } catch (error) {
    console.error("[e-Zone] Firestore profile sync failed", error);
    return buildFallbackProfile(user, preferredName);
  }
}

async function signInOrCreateOwnerAccount() {
  try {
    const credential = await signInWithEmailAndPassword(auth, OWNER_ACCOUNT.email, OWNER_ACCOUNT.password);
    await updateProfile(credential.user, { displayName: OWNER_ACCOUNT.fullName });
    return credential;
  } catch (error) {
    const code = String(error && typeof error === "object" && "code" in error ? error.code : "");
    if (!["auth/user-not-found", "auth/invalid-credential"].includes(code)) {
      throw error;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, OWNER_ACCOUNT.email, OWNER_ACCOUNT.password);
      await updateProfile(credential.user, { displayName: OWNER_ACCOUNT.fullName });
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

function createSocialProvider(providerName) {
  const key = String(providerName || "").trim().toLowerCase();

  if (key === "google") {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  if (key === "apple") {
    return new OAuthProvider("apple.com");
  }

  if (key === "microsoft") {
    const provider = new OAuthProvider("microsoft.com");
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  if (key === "facebook") {
    return new FacebookAuthProvider();
  }

  if (key === "github") {
    const provider = new GithubAuthProvider();
    provider.setCustomParameters({ allow_signup: "true" });
    return provider;
  }

  throw new Error(`Unsupported social provider: ${providerName}`);
}

function getSocialProviderLabel(providerName) {
  const key = String(providerName || "").trim().toLowerCase();
  return SOCIAL_PROVIDER_LABELS[key] || "Provider";
}

function shouldUseRedirectForSocialAuth() {
  return shouldDisableModalUi();
}

async function completeSocialSignIn(credential, providerName) {
  const preferredName = String(credential?.user?.displayName || "").trim();
  const profile = await syncCurrentUserProfile(credential.user, preferredName);
  const status = getAuthStatusElement();
  const providerLabel = getSocialProviderLabel(providerName);

  setStatus(
    status,
    profile.syncError
      ? `${providerLabel} sign-in succeeded. Firestore profile sync is pending, but your session is active.`
      : `${providerLabel} sign-in successful. Redirecting...`,
    false
  );

  clearPendingSocialProvider();
  window.location.href = getPostLoginDestination(credential.user);
}

async function handleSocialSignIn(providerName) {
  const providerKey = String(providerName || "").trim().toLowerCase();
  const status = getAuthStatusElement();
  const providerLabel = getSocialProviderLabel(providerKey);

  if (!isFirebaseConfigured()) {
    setStatus(status, "Update firebase.js with your Firebase project keys first.", true);
    return;
  }

  if (!SOCIAL_PROVIDER_LABELS[providerKey]) {
    setStatus(status, "That sign-in provider is not supported here.", true);
    return;
  }

  setStatus(status, `Opening ${providerLabel} sign-in...`, false);

  try {
    const provider = createSocialProvider(providerKey);
    rememberPendingSocialProvider(providerKey);

    if (shouldUseRedirectForSocialAuth()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    const credential = await signInWithPopup(auth, provider);
    await completeSocialSignIn(credential, providerKey);
  } catch (error) {
    const code = String(error && typeof error === "object" && "code" in error ? error.code : "");

    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) {
      try {
        const provider = createSocialProvider(providerKey);
        setStatus(status, `${providerLabel} popup was not available. Redirecting instead...`, false);
        rememberPendingSocialProvider(providerKey);
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error("[e-Zone] Social redirect sign-in failed", redirectError);
        clearPendingSocialProvider();
        setStatus(status, humanizeAuthError(redirectError), true);
        return;
      }
    }

    console.error("[e-Zone] Social sign-in failed", error);
    clearPendingSocialProvider();
    setStatus(status, humanizeAuthError(error), true);
  }
}

async function handleSocialRedirectResult() {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      return;
    }

    const rememberedProvider = readPendingSocialProvider();
    const providerId = String(result.providerId || "");
    const providerKey = rememberedProvider
      || (
        providerId === "google.com"
          ? "google"
          : providerId === "apple.com"
            ? "apple"
            : providerId === "microsoft.com"
              ? "microsoft"
              : providerId === "facebook.com"
                ? "facebook"
                : providerId === "github.com"
                  ? "github"
                  : ""
      );

    await completeSocialSignIn(result, providerKey);
  } catch (error) {
    console.error("[e-Zone] Social redirect result failed", error);
    clearPendingSocialProvider();
    setStatus(getAuthStatusElement(), humanizeAuthError(error), true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void initApp();
});

async function initApp() {
  console.info("[e-Zone] Initializing Firebase frontend");

  initPageLoader();
  initUserMenu();
  initFooterLinkEffects();
  initPasswordToggles();
  loadUiPreferences();
  initCustomModals();
  initLinkPreviewPopups();
  initActionCenterUpgrade();
  initMobileBrandMenu();
  bindGlobalActions();
  bindSignupForm();
  bindLoginForm();
  bindSocialAuthButtons();
  bindContactForm();
  bindBookFilters();
  bindFeedbackPage();
  bindAdminPage();
  bindDashboardShortcuts();
  bindOwnerUpdateForm();

  renderAllPages();

  if (!isFirebaseConfigured()) {
    console.warn("[e-Zone] Firebase config is still using placeholders");
    renderConfigurationWarnings();
    hidePageLoader();
    return;
  }

  void loadBooks();
  void loadOwnerUpdates();
  await handleSocialRedirectResult();

  onAuthStateChanged(auth, async (user) => {
    state.authResolved = true;
    state.currentUser = user;
    state.currentProfile = null;

    try {
      if (user) {
        console.info("[e-Zone] Authenticated user detected:", user.email || user.uid);
        state.currentProfile = await syncCurrentUserProfile(user);
        await Promise.all([loadUsers(), loadFeedback(), loadOwnerUpdates()]);
      } else {
        console.info("[e-Zone] No authenticated user");
        state.users = [];
        state.usersLoaded = false;
        state.usersError = "";
        state.feedback = [];
        state.feedbackLoaded = false;
        state.feedbackError = "";
        await loadOwnerUpdates();
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

function initFooterLinkEffects() {
  document.querySelectorAll(".site-footer .footer-links").forEach((group) => {
    if (!(group instanceof HTMLElement)) {
      return;
    }

    const links = Array.from(group.querySelectorAll("a"));
    const socialLinks = links.filter((link) => {
      return link instanceof HTMLAnchorElement
        && (/^https?:\/\//i.test(String(link.getAttribute("href") || "")) || link.target === "_blank");
    });

    if (socialLinks.length) {
      group.classList.add("footer-social");
    }

    socialLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      link.classList.add("footer-social-link");

      if (link.dataset.footerEnhanced === "1") {
        return;
      }

      const label = String(link.textContent || "").trim();
      const icon = createFooterSocialIcon(link.href);
      const text = document.createElement("span");
      text.className = "footer-social-label";
      text.textContent = label;

      link.textContent = "";
      link.append(icon, text);
      link.dataset.footerEnhanced = "1";
    });
  });
}

function createFooterSocialIcon(href = "") {
  const key = getFooterSocialProviderKey(href);
  const icon = document.createElement("span");
  icon.className = `footer-social-icon provider-${key}`;
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = getFooterSocialIconSvg(key);
  return icon;
}

function getFooterSocialProviderKey(href = "") {
  const url = String(href || "").toLowerCase();

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }

  if (url.includes("instagram.com")) {
    return "instagram";
  }

  if (url.includes("facebook.com")) {
    return "facebook";
  }

  if (url.includes("github.com")) {
    return "github";
  }

  return "external";
}

function getFooterSocialIconSvg(key = "") {
  const icons = {
    youtube: `
      <svg viewBox="0 0 24 24">
        <path fill="#ff3b30" d="M23.5 7.2a3 3 0 0 0-2.1-2.13C19.53 4.5 12 4.5 12 4.5s-7.53 0-9.4.57A3 3 0 0 0 .5 7.2C0 9.08 0 12 0 12s0 2.92.5 4.8a3 3 0 0 0 2.1 2.13c1.87.57 9.4.57 9.4.57s7.53 0 9.4-.57a3 3 0 0 0 2.1-2.13c.5-1.88.5-4.8.5-4.8s0-2.92-.5-4.8Z"></path>
        <path fill="#fff" d="m9.75 15.5 6.25-3.5-6.25-3.5v7Z"></path>
      </svg>
    `,
    instagram: `
      <svg viewBox="0 0 24 24">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="url(#igGradientFooter)" stroke-width="1.8"></rect>
        <circle cx="12" cy="12" r="4.1" fill="none" stroke="url(#igGradientFooter)" stroke-width="1.8"></circle>
        <circle cx="17.2" cy="6.8" r="1.2" fill="url(#igGradientFooter)"></circle>
        <defs>
          <linearGradient id="igGradientFooter" x1="3" x2="21" y1="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f58529"></stop>
            <stop offset=".35" stop-color="#feda77"></stop>
            <stop offset=".62" stop-color="#dd2a7b"></stop>
            <stop offset=".86" stop-color="#8134af"></stop>
            <stop offset="1" stop-color="#515bd4"></stop>
          </linearGradient>
        </defs>
      </svg>
    `,
    facebook: `
      <svg viewBox="0 0 24 24">
        <path fill="#1877f2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49H13.9V24C19.62 23.1 24 18.11 24 12.07Z"></path>
      </svg>
    `,
    github: `
      <svg viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54l-.02-2.08c-3.11.67-3.77-1.34-3.77-1.34-.5-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.16 1.71 1.16 1 .1.79 2.5 3.24 1.78.1-.73.39-1.23.71-1.51-2.48-.28-5.09-1.25-5.09-5.56 0-1.23.44-2.23 1.15-3.02-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.13-1.45 3.07-1.15 3.07-1.15.62 1.54.24 2.68.12 2.96.72.79 1.15 1.79 1.15 3.02 0 4.32-2.62 5.28-5.12 5.55.4.35.76 1.03.76 2.08l-.01 3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"></path>
      </svg>
    `,
    external: `
      <svg viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path>
      </svg>
    `
  };

  return icons[key] || icons.external;
}

function initLinkPreviewPopups() {
  if (!(document.body instanceof HTMLElement) || document.body.dataset.linkPreviewBound === "1") {
    return;
  }

  document.body.dataset.linkPreviewBound = "1";

  document.addEventListener("mouseover", (event) => {
    if (shouldDisableModalUi()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || !shouldShowLinkPreview(anchor)) {
      return;
    }

    if (activeLinkPreviewElement === anchor) {
      return;
    }

    activeLinkPreviewElement = anchor;
    showHoverHelp({
      kind: "link",
      label: getLinkPreviewLabel(anchor),
      message: getLinkPreviewMessage(anchor),
      persist: true
    });
  });

  document.addEventListener("mouseout", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || anchor !== activeLinkPreviewElement) {
      return;
    }

    const related = event.relatedTarget;
    if (related instanceof Node && anchor.contains(related)) {
      return;
    }

    activeLinkPreviewElement = null;
    hideHoverHelp();
  });

  document.addEventListener("focusin", (event) => {
    if (shouldDisableModalUi()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || !shouldShowLinkPreview(anchor)) {
      return;
    }

    activeLinkPreviewElement = anchor;
    showHoverHelp({
      kind: "link",
      label: getLinkPreviewLabel(anchor),
      message: getLinkPreviewMessage(anchor),
      persist: true
    });
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || anchor !== activeLinkPreviewElement) {
      return;
    }

    activeLinkPreviewElement = null;
    hideHoverHelp();
  });
}

function shouldShowLinkPreview(anchor) {
  const rawHref = String(anchor.getAttribute("href") || "").trim();
  if (!rawHref) {
    return false;
  }

  return !rawHref.toLowerCase().startsWith("javascript:");
}

function getLinkPreviewLabel(anchor) {
  const rawHref = String(anchor.getAttribute("href") || "").trim();

  if (rawHref.startsWith("#")) {
    return "Section Link";
  }

  try {
    const url = new URL(rawHref, window.location.href);
    if (url.protocol === "mailto:") {
      return "Email Link";
    }
    if (url.protocol === "tel:") {
      return "Phone Link";
    }
    return url.origin === window.location.origin ? "Page Link" : "External Link";
  } catch (error) {
    return "Link Preview";
  }
}

function getLinkPreviewMessage(anchor) {
  const rawHref = String(anchor.getAttribute("href") || "").trim();

  if (!rawHref) {
    return "";
  }

  if (rawHref.startsWith("#")) {
    return `${window.location.origin}${window.location.pathname}${rawHref}`;
  }

  try {
    return new URL(rawHref, window.location.href).href;
  } catch (error) {
    return rawHref;
  }
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

    const modalTrigger = target.closest("[data-open-modal]");
    if (modalTrigger instanceof HTMLElement) {
      event.preventDefault();
      openModal(String(modalTrigger.getAttribute("data-open-modal") || ""));
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
      const profile = await syncCurrentUserProfile(credential.user, name);
      console.info("[e-Zone] Signup complete for", email);
      setStatus(
        status,
        profile.syncError
          ? "Account created. Firestore profile sync is pending, but you can continue."
          : "Account created successfully. Redirecting...",
        false
      );
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
      const profile = await syncCurrentUserProfile(credential.user);
      console.info("[e-Zone] Login complete for", email);
      setStatus(
        status,
        profile.syncError
          ? "Login succeeded. Firestore profile sync is pending, but your session is active."
          : "Login successful. Redirecting...",
        false
      );
      form.reset();
      window.location.href = getPostLoginDestination(credential.user);
    } catch (error) {
      console.error("[e-Zone] Login failed", error);
      setStatus(status, humanizeAuthError(error), true);
    }
  });
}

function bindSocialAuthButtons() {
  document.querySelectorAll("[data-social-login]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement) || button.dataset.bound === "1") {
      return;
    }

    button.dataset.bound = "1";

    button.addEventListener("click", async () => {
      const providerName = String(button.getAttribute("data-social-login") || "");
      await handleSocialSignIn(providerName);
    });
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
      openModal("dashboard-users");
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

function bindOwnerUpdateForm() {
  const form = document.getElementById("owner-update-form");
  if (!(form instanceof HTMLFormElement) || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = document.getElementById("owner-update-status");

    if (!isFirebaseConfigured()) {
      setStatus(status, "Update firebase.js before publishing updates.", true);
      return;
    }

    if (!state.currentUser || !isOwnerUser()) {
      setStatus(status, "Only the owner account can publish updates.", true);
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!message) {
      setStatus(status, "Please write an update message first.", true);
      return;
    }

    setStatus(status, "Publishing update...", false);

    try {
      await submitOwnerUpdateEntry({
        title,
        message
      });
      form.reset();
      await loadOwnerUpdates();
      renderAllPages();
      setStatus(status, "Update published and synced to notifications.", false);
    } catch (error) {
      console.error("[e-Zone] Could not publish owner update", error);
      setStatus(status, "Could not publish update right now.", true);
    }
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

async function loadOwnerUpdates() {
  if (!isFirebaseConfigured()) {
    state.ownerUpdates = [];
    state.ownerUpdatesLoaded = false;
    state.ownerUpdatesError = "";
    return [];
  }

  console.info("[e-Zone] Fetching owner updates from Firestore");

  try {
    const snapshot = await getDocs(collection(db, "ownerUpdates"));
    state.ownerUpdates = snapshot.docs.map(mapOwnerUpdateDocument).sort(sortByNewest);
    state.ownerUpdatesError = "";
  } catch (error) {
    console.error("[e-Zone] Could not fetch owner updates", error);
    state.ownerUpdates = [];
    state.ownerUpdatesError = "Could not load owner updates from Firestore.";
  } finally {
    state.ownerUpdatesLoaded = true;
    renderAllPages();
  }

  return state.ownerUpdates;
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

async function submitOwnerUpdateEntry({ title, message }) {
  if (!state.currentUser || !isOwnerUser()) {
    throw new Error("Only the owner account can publish updates.");
  }

  const ownerName = String(state.currentProfile?.name || OWNER_ACCOUNT.fullName || "Owner").trim();

  await addDoc(collection(db, "ownerUpdates"), {
    title: String(title || "").trim() || "Owner Update",
    message: String(message || "").trim(),
    ownerName,
    ownerEmail: state.currentUser.email || OWNER_ACCOUNT.email,
    createdAt: serverTimestamp(),
    createdBy: state.currentUser.uid
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

function initActionCenterUpgrade() {
  if (document.body.dataset.actionCenterBound === "1") {
    return;
  }

  document.body.dataset.actionCenterBound = "1";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const themeToggle = target.closest("[data-theme-pill-toggle]");
    if (themeToggle) {
      event.preventDefault();
      cycleActionCenterTheme();
    }
  });
}

function renderActionCenterUpgrade() {
  ensureActionCenterUpgradeMarkup();
  renderOwnerNotificationsButton();
  renderActionCenterThemePill();
  renderActionCenterSection();
}

function ensureActionCenterUpgradeMarkup() {
  document.querySelectorAll(".control-center").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    let notificationHost = root.querySelector("[data-notification-host]");
    if (!(notificationHost instanceof HTMLElement)) {
      notificationHost = document.createElement("div");
      notificationHost.setAttribute("data-notification-host", "");
      const loginLink = root.querySelector('[data-auth-link="login"]');
      if (loginLink) {
        root.insertBefore(notificationHost, loginLink);
      } else {
        root.insertBefore(notificationHost, root.firstChild);
      }
    }

    let host = root.querySelector("[data-theme-pill-host]");
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.setAttribute("data-theme-pill-host", "");
      root.append(host);
    }
  });

  document.querySelectorAll("[data-user-menu]").forEach((menu) => {
    if (!(menu instanceof HTMLElement) || menu.querySelector("[data-action-center-upgrade]")) {
      return;
    }

    const reference = menu.querySelector("[data-user-dashboard], [data-admin-dashboard]");
    const template = document.createElement("template");
    template.innerHTML = buildActionCenterSectionMarkup().trim();
    const nextSection = template.content.firstElementChild;

    if (!nextSection) {
      return;
    }

    if (reference) {
      menu.insertBefore(nextSection, reference);
      return;
    }

    menu.append(nextSection);
  });
}

function renderOwnerNotificationsButton() {
  const updatesCount = state.ownerUpdatesLoaded ? state.ownerUpdates.length : 0;
  const badgeText = updatesCount > 99 ? "99+" : String(updatesCount);
  const hint = state.ownerUpdatesError
    ? "Owner updates are temporarily unavailable."
    : state.ownerUpdatesLoaded
      ? `${updatesCount} owner update${updatesCount === 1 ? "" : "s"} available`
      : "Loading owner updates...";

  document.querySelectorAll("[data-notification-host]").forEach((host) => {
    if (!(host instanceof HTMLElement)) {
      return;
    }

    host.innerHTML = `
      <button
        class="notif-btn"
        type="button"
        data-open-modal="owner-updates"
        aria-label="Open owner updates notifications"
        title="${escapeHtml(hint)}"
      >
        <span class="notif-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"></path>
            <path d="M9.8 17a2.2 2.2 0 0 0 4.4 0"></path>
          </svg>
        </span>
        <span class="notif-label">Updates</span>
        <span class="notif-badge${state.ownerUpdatesError ? " is-error" : ""}" data-owner-update-count>${escapeHtml(state.ownerUpdatesLoaded ? badgeText : "...")}</span>
      </button>
    `;
  });
}

function renderActionCenterThemePill() {
  if (!state.currentUser) {
    document.querySelectorAll("[data-theme-pill-host]").forEach((host) => {
      if (host instanceof HTMLElement) {
        host.innerHTML = "";
      }
    });
    return;
  }

  const resolvedTheme = getResolvedThemeMode();
  const label = capitalizeLabel(resolvedTheme);
  const nextLabel = resolvedTheme === "dark" ? "Light" : "Dark";
  const ariaLabel = `Theme is set to ${label}. Click to switch to ${nextLabel} mode.`;

  document.querySelectorAll("[data-theme-pill-host]").forEach((host) => {
    if (!(host instanceof HTMLElement)) {
      return;
    }

    host.innerHTML = `
      <button
        class="theme-toggle-pill is-${escapeHtml(resolvedTheme)}"
        type="button"
        data-theme-pill-toggle
        aria-label="${escapeHtml(ariaLabel)}"
        title="${escapeHtml(ariaLabel)}"
      >
        <span class="theme-pill-track" aria-hidden="true">
          <span class="theme-pill-icon sun">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2"></circle>
              <path d="M12 2.5v2.3M12 19.2v2.3M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"></path>
            </svg>
          </span>
          <span class="theme-pill-icon moon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 14.4A8.5 8.5 0 0 1 9.6 4a8.7 8.7 0 1 0 10.4 10.4Z"></path>
            </svg>
          </span>
          <span class="theme-pill-knob"></span>
        </span>
        <span class="theme-pill-label">${escapeHtml(label)}</span>
      </button>
    `;
  });
}

function renderActionCenterSection() {
  const isLoggedIn = Boolean(state.currentUser);
  const isOwner = isOwnerUser();
  const currentName = getCurrentUserName();
  const currentEmail = state.currentUser?.email || "Please login";
  const identityRole = isOwner ? "Owner Access" : isLoggedIn ? "Member Access" : "Guest Access";
  const identityMeta = isOwner ? OWNER_ACCOUNT.fullName : isLoggedIn ? currentName || currentEmail : "Guest User";
  const identityAvatar = avatarLetters(isLoggedIn ? currentName || currentEmail : "EZ");
  const myFeedback = isLoggedIn
    ? state.feedback.filter((item) => normalizeEmail(item.userEmail) === normalizeEmail(state.currentUser?.email || ""))
    : [];
  const feedbackCount = isOwner ? state.feedback.length : myFeedback.length;
  const feedbackLabel = isOwner ? "Queue" : isLoggedIn ? "My Notes" : "Access";
  const feedbackValue = isLoggedIn ? String(feedbackCount) : "Locked";
  const sessionLabel = isOwner ? "Owner Live" : isLoggedIn ? "Member Live" : "Guest";
  const pageLabel = getCurrentPageLabel();
  const note = isOwner
    ? "Owner shortcuts, queue visibility, and live page context are ready here."
    : isLoggedIn
      ? "Quick links, session context, and Firebase-backed status live in one place."
      : "Sign in to unlock the full action center and account-linked tools.";
  const activityItems = getActionCenterActivityItems(isOwner, isLoggedIn, myFeedback, pageLabel);

  document.querySelectorAll("[data-action-center-upgrade]").forEach((section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    section.classList.toggle("is-owner", isOwner);
    section.classList.toggle("is-member", isLoggedIn && !isOwner);
    section.classList.toggle("is-guest", !isLoggedIn);
  });

  setManyTexts("[data-action-center-note]", note);
  setManyTexts("[data-action-center-page]", pageLabel);
  setManyTexts("[data-action-center-books]", state.booksLoaded ? String(state.books.length) : "--");
  setManyTexts("[data-action-center-feedback-label]", feedbackLabel);
  setManyTexts("[data-action-center-feedback]", feedbackValue);
  setManyTexts("[data-action-center-role]", identityRole);
  setManyTexts("[data-action-center-meta]", identityMeta);

  document.querySelectorAll("[data-action-center-session]").forEach((chip) => {
    if (!(chip instanceof HTMLElement)) {
      return;
    }

    chip.textContent = sessionLabel;
    chip.classList.remove("is-owner", "is-member", "is-guest");
    chip.classList.add(isOwner ? "is-owner" : isLoggedIn ? "is-member" : "is-guest");
  });

  document.querySelectorAll("[data-action-center-avatar]").forEach((avatar) => {
    applyAvatarPreferenceToElement(
      avatar,
      String(state.uiPreferences?.avatarImage || ""),
      identityAvatar
    );
  });

  document.querySelectorAll("[data-action-center-links]").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    root.innerHTML = buildActionCenterLinks();
  });

  document.querySelectorAll("[data-action-center-log]").forEach((root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    root.innerHTML = activityItems.map((item) => `
      <div class="menu-log-item">
        <span>${escapeHtml(item.title)}</span>
        ${escapeHtml(item.body)}
      </div>
    `).join("");
  });
}

function buildActionCenterSectionMarkup() {
  return `
    <section class="user-menu-section action-center-upgrade" data-action-center-upgrade>
      <div class="action-center-head">
        <div>
          <h4>Action Center</h4>
          <p class="control-center-note" data-action-center-note>Quick links and live status will appear here.</p>
        </div>
        <span class="action-center-chip" data-action-center-session>Guest</span>
      </div>
      <div class="action-center-identity">
        <span class="profile-avatar action-center-avatar" data-action-center-avatar>EZ</span>
        <div class="action-center-identity-copy">
          <strong data-action-center-role>Guest Access</strong>
          <span data-action-center-meta>Guest User</span>
        </div>
      </div>
      <div class="action-center-grid" data-action-center-links></div>
      <div class="action-center-stats">
        <article class="action-center-mini-stat">
          <span>Current Page</span>
          <strong data-action-center-page>Home</strong>
        </article>
        <article class="action-center-mini-stat">
          <span>Library</span>
          <strong data-action-center-books>--</strong>
        </article>
        <article class="action-center-mini-stat">
          <span data-action-center-feedback-label>Access</span>
          <strong data-action-center-feedback>Locked</strong>
        </article>
      </div>
      <div class="menu-log action-center-log" data-action-center-log></div>
    </section>
  `;
}

function buildActionCenterLinks() {
  const currentFile = getCurrentPageFileName();
  const links = getActionCenterLinks();

  return links.map((item) => {
    const targetFile = getFileNameFromHref(item.href);
    const currentClass = targetFile === currentFile ? " is-current" : "";

    return `
      <a class="action-center-card${currentClass}" href="${escapeHtml(item.href)}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.note)}</span>
      </a>
    `;
  }).join("");
}

function getActionCenterLinks() {
  if (isOwnerUser()) {
    return [
      { href: "dashboard.html", label: "Dashboard", note: "Open the owner command board." },
      { href: "admin.html", label: "Upload Books", note: "Publish or update the library." },
      { href: "logs.html", label: "Logs", note: "Review users and feedback flow." },
      { href: "purchase-links.html", label: "Links", note: "Check live purchase destinations." }
    ];
  }

  if (state.currentUser) {
    return [
      { href: "user-dashboard.html", label: "My Dashboard", note: "Open your account activity view." },
      { href: "books.html", label: "Browse Books", note: "Jump into the live Firestore library." },
      { href: "feedback.html", label: "Feedback", note: "Send bugs or suggestions quickly." },
      { href: "contact.html", label: "Contact", note: "Reach support without leaving the site." }
    ];
  }

  return [
    { href: "login.html", label: "Login", note: "Sign in to unlock account tools." },
    { href: "signup.html", label: "Create Account", note: "Register a new Firebase-backed user." },
    { href: "books.html", label: "Browse Books", note: "Explore the public catalog first." },
    { href: "contact.html", label: "Contact", note: "Send a support message anytime." }
  ];
}

function getActionCenterActivityItems(isOwner, isLoggedIn, myFeedback, pageLabel) {
  const items = [];

  items.push({
    title: "Now Viewing",
    body: `You are currently on ${pageLabel}.`
  });

  if (!isFirebaseConfigured()) {
    items.push({
      title: "Firebase Setup",
      body: "Add your Firebase web app config in firebase.js to finish live sync."
    });
    return items;
  }

  if (!state.booksLoaded) {
    items.push({
      title: "Library Sync",
      body: "Books are loading from Firestore right now."
    });
  } else if (state.booksError) {
    items.push({
      title: "Library Sync",
      body: state.booksError
    });
  } else if (state.books[0]) {
    items.push({
      title: "Latest Book",
      body: `${state.books[0].title} is live in ${state.books[0].category}.`
    });
  } else {
    items.push({
      title: "Library",
      body: "No books are published yet."
    });
  }

  if (isOwner) {
    if (!state.feedbackLoaded) {
      items.push({
        title: "Feedback Queue",
        body: "Owner feedback entries are syncing now."
      });
    } else if (state.feedbackError) {
      items.push({
        title: "Feedback Queue",
        body: state.feedbackError
      });
    } else if (state.feedback[0]) {
      items.push({
        title: "Feedback Queue",
        body: `${state.feedback.length} entries stored. Latest: ${truncateText(state.feedback[0].message, 74)}`
      });
    } else {
      items.push({
        title: "Feedback Queue",
        body: "No feedback has been submitted yet."
      });
    }
  } else if (isLoggedIn) {
    if (!state.feedbackLoaded) {
      items.push({
        title: "Your Activity",
        body: "Your feedback timeline is syncing."
      });
    } else if (myFeedback[0]) {
      items.push({
        title: "Your Activity",
        body: `${myFeedback.length} messages saved. Latest: ${truncateText(myFeedback[0].message, 74)}`
      });
    } else {
      items.push({
        title: "Your Activity",
        body: "Send your first feedback to start your timeline."
      });
    }
  } else {
    items.push({
      title: "Session",
      body: "Login or create an account to open personalized tools."
    });
  }

  return items.slice(0, 4);
}

function getResolvedThemeMode() {
  return normalizeUiPreferences(state.uiPreferences).theme;
}

function cycleActionCenterTheme() {
  if (!state.currentUser) {
    showPopupModal({
      kind: "warning",
      label: "Login Required",
      title: "Theme Toggle Locked",
      message: "Theme switching is available only after login or signup."
    });
    return;
  }

  const current = getResolvedThemeMode();
  const next = current === "dark" ? "light" : "dark";

  state.uiPreferences = normalizeUiPreferences({
    ...state.uiPreferences,
    theme: next
  });
  persistUiPreferences();
  updateProfileCustomizeModal();
  renderActionCenterUpgrade();

  const message = `${capitalizeLabel(next)} theme enabled.`;

  if (shouldDisableModalUi()) {
    showMobileInlineNotice({
      label: "Theme Updated",
      message
    });
    return;
  }

  showHoverHelp({
    kind: "action",
    label: "Theme Updated",
    message
  });
}

function getCurrentPageFileName() {
  const raw = String(window.location.pathname || "").split("/").pop() || "index.html";
  return raw.toLowerCase();
}

function getCurrentPageLabel() {
  const fileName = getCurrentPageFileName();
  return PAGE_LABELS[fileName] || capitalizeLabel(fileName.replace(".html", "")) || "Current Page";
}

function getFileNameFromHref(href) {
  return String(href || "").split("/").pop().toLowerCase();
}

function capitalizeLabel(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
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
  renderRestoredModals();
  renderActionCenterUpgrade();
  updateMobileHeaderMode();
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
    getResolvedUserBio(
      isOwner
        ? "Owner controls are unlocked for Abir Biswas."
        : isLoggedIn
          ? "Connected through Firebase Authentication."
          : "Please sign in to continue."
    )
  );
  setManyTexts("[data-user-meta]", memberSince);
  setManyTexts("[data-profile-avatar]", initials);
  setManyTexts("[data-user-avatar]", initials);
  applyAvatarPreferenceToTargets();

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

  updateProfileCustomizeModal();
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

  const updatesRoot = document.getElementById("owner-update-list");
  if (updatesRoot) {
    if (!state.ownerUpdatesLoaded) {
      updatesRoot.innerHTML = "<div class='menu-log-item'><span>Loading updates...</span>Waiting for Firestore sync.</div>";
    } else if (state.ownerUpdatesError) {
      updatesRoot.innerHTML = `<div class='menu-log-item'><span>Updates unavailable</span>${escapeHtml(state.ownerUpdatesError)}</div>`;
    } else if (!state.ownerUpdates.length) {
      updatesRoot.innerHTML = "<div class='menu-log-item'><span>No updates yet</span>Use the publish form above to post update announcements.</div>";
    } else {
      updatesRoot.innerHTML = state.ownerUpdates.slice(0, 12).map((item) => `
        <div class="menu-log-item">
          <span>${escapeHtml(item.title || "Owner Update")}</span>
          <p class="feedback-content">${escapeHtml(item.message || "")}</p>
          <small>${escapeHtml(item.ownerName || "Owner")} - ${formatDateTime(item.createdAt)}</small>
        </div>
      `).join("");
    }
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

  const filterForm = document.getElementById("uploaded-books-filter-form");
  if (filterForm instanceof HTMLFormElement && filterForm.dataset.bound !== "1") {
    filterForm.dataset.bound = "1";
    const rerender = () => {
      renderUploadedBooksPage();
    };
    filterForm.addEventListener("input", rerender);
    filterForm.addEventListener("change", rerender);

    const resetButton = filterForm.querySelector("[data-uploaded-books-filter-reset]");
    if (resetButton instanceof HTMLButtonElement) {
      resetButton.addEventListener("click", () => {
        filterForm.reset();
        rerender();
      });
    }
  }

  const root = document.getElementById("uploaded-books-list");
  if (!root) {
    return;
  }

  const filteredBooks = filterBooks({
    ...getUploadedBooksFilterValues(filterForm),
    sortBy: "newest"
  });

  const summaryNode = document.getElementById("uploaded-books-summary");
  if (summaryNode instanceof HTMLElement) {
    summaryNode.textContent = `${filteredBooks.length} result${filteredBooks.length === 1 ? "" : "s"} shown`;
  }

  root.innerHTML = filteredBooks.length
    ? filteredBooks.map((book) => renderBookCard(book, { showMeta: true })).join("")
    : state.books.length
      ? "<article class='ebook-card placeholder-cell'><p>No books match the current filters.</p></article>"
      : "<article class='ebook-card placeholder-cell'><p>No books are stored in Firestore yet.</p></article>";

  hydrateCovers(root);
}

function getUploadedBooksFilterValues(form) {
  if (!(form instanceof HTMLFormElement)) {
    return {
      query: "",
      category: "all",
      lang: "all",
      featured: "all"
    };
  }

  const formData = new FormData(form);
  return {
    query: String(formData.get("query") || "").trim(),
    category: String(formData.get("category") || "all"),
    lang: String(formData.get("lang") || "all"),
    featured: String(formData.get("featured") || "all")
  };
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
    "uploaded-books-list",
    "owner-update-list"
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

  setText("uploaded-books-summary", message);
  setText("owner-update-status", message);
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

function mapOwnerUpdateDocument(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    title: String(data.title || "Owner Update"),
    message: String(data.message || ""),
    ownerName: String(data.ownerName || OWNER_ACCOUNT.fullName || "Owner"),
    ownerEmail: String(data.ownerEmail || ""),
    createdAt: safeDate(data.createdAt) || new Date()
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

  const updateItems = state.ownerUpdates.map((item) => ({
    title: `Owner Update - ${item.title || "Announcement"}`,
    detail: truncateText(item.message, 100),
    time: item.createdAt
  }));

  return [...feedbackItems, ...bookItems, ...updateItems].sort((left, right) => {
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
  const message = String(error && typeof error === "object" && "message" in error ? error.message : "").trim();

  const messages = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method. Use your original provider or link the account in Firebase.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Try again and allow popups, or use the redirect flow on mobile.",
    "auth/popup-closed-by-user": "The sign-in popup was closed before login finished.",
    "auth/cancelled-popup-request": "A sign-in popup was interrupted by another auth request. Please try again.",
    "auth/owner-account-mismatch": "This reserved owner email already exists in Firebase with a different password. Update it in the Firebase console to #youtuber#69# if you want this exact owner login to work.",
    "auth/configuration-not-found": "Firebase Authentication is not fully configured for this project. In Firebase Console, enable Email/Password sign-in and verify the app/auth setup for this site.",
    "auth/missing-password": "Password is required.",
    "auth/operation-not-allowed": "Email/password login is not enabled in Firebase Authentication yet.",
    "auth/operation-not-supported-in-this-environment": "This browser environment does not support popup auth cleanly. Try again on a normal browser window or use the redirect flow.",
    "auth/app-not-authorized": "This site is not authorized to use the current Firebase project. Check your Firebase web app config and authorized setup.",
    "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication. Add your local or Vercel domain in Firebase Console under Authentication settings.",
    "auth/invalid-api-key": "The Firebase API key or web app config is invalid for this project.",
    "auth/invalid-oauth-provider": "That OAuth provider is not configured correctly in Firebase Authentication.",
    "auth/missing-or-invalid-nonce": "Apple sign-in needs a valid provider setup. Recheck the Apple provider configuration in Firebase.",
    "permission-denied": "Firestore denied access while finishing login. Check your Firebase rules for users and admins.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
  };

  return messages[code] || message || "The authentication request could not be completed.";
}
