
const STORAGE_KEYS = {
  users: "ezone_users_v3",
  session: "ezone_session_v3",
  customBooks: "ezone_custom_books_v3",
  theme: "ezone_theme_v1",
  accountPrefs: "ezone_account_prefs_v1",
  controlCenterLogs: "ezone_control_center_logs_v1",
  bookReviews: "ezone_book_reviews_v1",
  cloudConfig: "ezone_cloud_config_v1",
  chatbotHistory: "ezone_chatbot_history_v1",
  chatbotState: "ezone_chatbot_state_v1"
};

const ADMIN_ACCOUNT = {
  name: "e-Zone Owner",
  email: "abirxxdbrine2024@gmail.com",
  password: "6769#6967",
  role: "owner"
};

function isOwnerRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "owner" || normalized === "admin";
}

function normalizeRole(role) {
  return isOwnerRole(role) ? "owner" : "user";
}

const CATEGORIES = [
  "Love and Romance",
  "Fiction",
  "Biography",
  "Science and Tech"
];

const CATEGORY_SLUGS = Object.fromEntries(
  CATEGORIES.map((category) => [category, slugify(category)])
);

const COVER_PALETTES = [
  ["#8cb5ff", "#ff92d8"],
  ["#73d0ff", "#7e7cff"],
  ["#f7b38a", "#ff7ab8"],
  ["#8df0dd", "#6d8dff"],
  ["#ffb6df", "#9c8fff"]
];

const SOCIAL_LINKS = {
  youtube: "https://youtube.com/@MysTryReyal",
  instagram: "https://www.instagram.com/am_i_bisashable_/"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function formatPrice(price) {
  const amount = Number(price) || 0;
  return `BDT ${amount.toLocaleString("en-US")}`;
}

function createId(prefix) {
  const stamp = Date.now().toString(36);
  const salt = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${salt}`;
}

function pickPalette(seedSource) {
  const seed = String(seedSource || "seed").length;
  return COVER_PALETTES[seed % COVER_PALETTES.length];
}

function buildCoverImage(title, subtitle) {
  const [start, end] = pickPalette(title + subtitle);
  const safeTitle = escapeHtml(title).slice(0, 24);
  const safeSubtitle = escapeHtml(subtitle).slice(0, 28);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="420" height="620" fill="url(#g)"/>
      <rect x="20" y="20" width="380" height="580" rx="22" fill="rgba(255,255,255,0.28)"/>
      <rect x="42" y="48" width="336" height="178" rx="14" fill="rgba(255,255,255,0.36)"/>
      <text x="210" y="125" text-anchor="middle" fill="#2b2347" font-size="32" font-family="Chewy, Arial">${safeTitle}</text>
      <text x="210" y="170" text-anchor="middle" fill="#433a68" font-size="17" font-family="Nunito, Arial">${safeSubtitle}</text>
      <line x1="52" y1="282" x2="358" y2="282" stroke="rgba(43,35,71,0.3)" stroke-width="2"/>
      <line x1="52" y1="314" x2="338" y2="314" stroke="rgba(43,35,71,0.22)" stroke-width="2"/>
      <line x1="52" y1="346" x2="352" y2="346" stroke="rgba(43,35,71,0.22)" stroke-width="2"/>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createDefaultBook(id, title, author, lang, category, price, featured) {
  return {
    id,
    title,
    author,
    lang,
    category,
    price,
    featured,
    desc: `${title} is a ${lang} ${category.toLowerCase()} title curated for e-Zone readers who want modern storytelling and clear reading flow.`,
    coverPreview: buildCoverImage(title, category),
    coverPdfName: "Default Cover",
    coverPdfData: "",
    rokomariUrl: "",
    qrImageName: "",
    qrImageData: "",
    qrImageUrl: "",
    isCustom: false
  };
}

const DEFAULT_BOOKS = [];
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function getUsers() {
  const users = readStorage(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  writeStorage(STORAGE_KEYS.users, users);
}

function getSession() {
  const session = readStorage(STORAGE_KEYS.session, null);
  if (!session || typeof session !== "object") {
    return null;
  }
  return session;
}

function setSession(session) {
  writeStorage(STORAGE_KEYS.session, session);
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.session);
  } catch (error) {
    // no-op
  }
}

function normalizeSessionRole() {
  const session = getSession();
  if (!session) {
    return;
  }

  const nextRole = normalizeRole(session.role);
  if (session.role !== nextRole) {
    setSession({
      ...session,
      role: nextRole
    });
  }
}

function getCustomBooks() {
  const books = readStorage(STORAGE_KEYS.customBooks, []);
  return Array.isArray(books) ? books.filter((book) => book && typeof book === "object") : [];
}

function saveCustomBooks(books) {
  writeStorage(STORAGE_KEYS.customBooks, books);
}

function getBookReviewsMap() {
  const stored = readStorage(STORAGE_KEYS.bookReviews, {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return {};
  }

  const sanitized = {};
  Object.entries(stored).forEach(([bookId, reviews]) => {
    if (!Array.isArray(reviews)) {
      return;
    }

    sanitized[bookId] = reviews
      .filter((review) => review && typeof review === "object")
      .map((review) => {
        const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
        return {
          id: String(review.id || ""),
          bookId: String(review.bookId || bookId),
          userId: String(review.userId || ""),
          email: normalizeEmail(review.email || ""),
          name: String(review.name || "Reader"),
          rating,
          comment: String(review.comment || "").slice(0, 700),
          createdAt: String(review.createdAt || ""),
          updatedAt: String(review.updatedAt || review.createdAt || "")
        };
      })
      .filter((review) => Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5);
  });

  return sanitized;
}

function saveBookReviewsMap(map) {
  writeStorage(STORAGE_KEYS.bookReviews, map && typeof map === "object" ? map : {});
}

function getBookReviews(bookId) {
  if (!bookId) {
    return [];
  }

  const reviewsMap = getBookReviewsMap();
  const reviews = Array.isArray(reviewsMap[bookId]) ? reviewsMap[bookId] : [];
  return reviews
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
}

function getBookRatingSummary(bookId) {
  const reviews = getBookReviews(bookId);
  if (!reviews.length) {
    return {
      average: 0,
      count: 0
    };
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const average = Math.round((total / reviews.length) * 10) / 10;
  return {
    average,
    count: reviews.length
  };
}

function formatBookRatingSummary(bookId) {
  const summary = getBookRatingSummary(bookId);
  if (!summary.count) {
    return "No ratings yet";
  }
  const plural = summary.count === 1 ? "review" : "reviews";
  return `${summary.average.toFixed(1)}/5 (${summary.count} ${plural})`;
}

function upsertBookReview(bookId, session, rating, comment) {
  if (!bookId || !session) {
    return false;
  }

  const score = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)));
  if (!score) {
    return false;
  }

  const safeComment = String(comment || "").trim().slice(0, 700);
  const reviewsMap = getBookReviewsMap();
  const entries = Array.isArray(reviewsMap[bookId]) ? reviewsMap[bookId].slice() : [];
  const now = new Date().toISOString();
  const email = normalizeEmail(session.email);
  const prefs = getAccountPrefs(session.id);
  const displayName = String(prefs.displayName || session.name || email.split("@")[0] || "Reader").trim();

  const existingIndex = entries.findIndex((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    if (session.id && String(entry.userId || "") === String(session.id)) {
      return true;
    }
    return normalizeEmail(entry.email || "") === email;
  });

  if (existingIndex >= 0) {
    const existing = entries[existingIndex];
    entries[existingIndex] = {
      ...existing,
      bookId,
      userId: session.id || existing.userId || "",
      email,
      name: displayName || existing.name || "Reader",
      rating: score,
      comment: safeComment,
      updatedAt: now,
      createdAt: String(existing.createdAt || now)
    };
  } else {
    entries.push({
      id: createId("review"),
      bookId,
      userId: session.id || "",
      email,
      name: displayName || "Reader",
      rating: score,
      comment: safeComment,
      createdAt: now,
      updatedAt: now
    });
  }

  reviewsMap[bookId] = entries;
  saveBookReviewsMap(reviewsMap);
  return true;
}

function removeBookReviews(bookId) {
  if (!bookId) {
    return;
  }
  const reviewsMap = getBookReviewsMap();
  if (!reviewsMap[bookId]) {
    return;
  }
  delete reviewsMap[bookId];
  saveBookReviewsMap(reviewsMap);
}

function getCloudConfig() {
  const stored = readStorage(STORAGE_KEYS.cloudConfig, {});
  const source = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};

  return {
    provider: "cloudinary",
    enabled: Boolean(source.enabled),
    cloudName: String(source.cloudName || "").trim(),
    uploadPreset: String(source.uploadPreset || "").trim(),
    folder: String(source.folder || "e-zone").trim()
  };
}

function saveCloudConfig(config) {
  const next = {
    provider: "cloudinary",
    enabled: Boolean(config && config.enabled),
    cloudName: String(config && config.cloudName ? config.cloudName : "").trim(),
    uploadPreset: String(config && config.uploadPreset ? config.uploadPreset : "").trim(),
    folder: String(config && config.folder ? config.folder : "e-zone").trim()
  };
  writeStorage(STORAGE_KEYS.cloudConfig, next);
}

function isCloudUploadReady(config) {
  return Boolean(
    config
    && config.enabled
    && String(config.cloudName || "").trim()
    && String(config.uploadPreset || "").trim()
  );
}

function normalizeRokomariUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch (error) {
    return "";
  }
}

function isValidRokomariUrl(value) {
  const normalized = normalizeRokomariUrl(value);
  if (!normalized) {
    return false;
  }
  try {
    const url = new URL(normalized);
    const host = String(url.hostname || "").toLowerCase();
    return host === "rokomari.com" || host.endsWith(".rokomari.com");
  } catch (error) {
    return false;
  }
}

async function uploadPdfToCloudinary(file, config, prefix) {
  const cloudName = encodeURIComponent(String(config.cloudName || "").trim());
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", String(config.uploadPreset || "").trim());
  if (String(config.folder || "").trim()) {
    body.append("folder", String(config.folder).trim());
  }
  body.append("public_id", `${prefix}-${createId("pdf")}`);

  const response = await fetch(endpoint, {
    method: "POST",
    body
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok || !payload || !payload.secure_url) {
    const message = String(payload && payload.error && payload.error.message
      ? payload.error.message
      : "Cloud upload failed.");
    throw new Error(message);
  }

  return {
    url: String(payload.secure_url || ""),
    publicId: String(payload.public_id || ""),
    bytes: Number(payload.bytes || 0)
  };
}

async function uploadImageToCloudinary(file, config, prefix) {
  const cloudName = encodeURIComponent(String(config.cloudName || "").trim());
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", String(config.uploadPreset || "").trim());
  if (String(config.folder || "").trim()) {
    body.append("folder", String(config.folder).trim());
  }
  body.append("public_id", `${prefix}-${createId("img")}`);

  const response = await fetch(endpoint, {
    method: "POST",
    body
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok || !payload || !payload.secure_url) {
    const message = String(payload && payload.error && payload.error.message
      ? payload.error.message
      : "Image cloud upload failed.");
    throw new Error(message);
  }

  return {
    url: String(payload.secure_url || ""),
    publicId: String(payload.public_id || ""),
    bytes: Number(payload.bytes || 0)
  };
}

function getAccountPrefsMap() {
  const prefs = readStorage(STORAGE_KEYS.accountPrefs, {});
  return prefs && typeof prefs === "object" && !Array.isArray(prefs) ? prefs : {};
}

function saveAccountPrefsMap(prefs) {
  writeStorage(STORAGE_KEYS.accountPrefs, prefs);
}

function normalizeProfileImageData(value) {
  const data = String(value || "").trim();
  if (!data.startsWith("data:image/")) {
    return "";
  }
  if (data.length > 2_600_000) {
    return "";
  }
  return data;
}

function getAccountPrefs(userId) {
  const defaults = {
    displayName: "",
    bio: "",
    accent: "",
    profileImage: "",
    compact: false,
    layoutDensity: "comfortable",
    glowIntensity: 70,
    fontScale: 1,
    radius: 20,
    animationIntensity: "full",
    respectReducedMotion: true,
    scrollBehavior: "smooth",
    showEmail: true,
    showActivity: true,
    publicProfile: true,
    showPurchases: true
  };

  if (!userId) {
    return defaults;
  }

  const prefsMap = getAccountPrefsMap();
  const saved = prefsMap[userId];
  if (!saved || typeof saved !== "object") {
    return defaults;
  }

  return {
    displayName: String(saved.displayName || ""),
    bio: String(saved.bio || ""),
    accent: String(saved.accent || ""),
    profileImage: normalizeProfileImageData(saved.profileImage),
    compact: Boolean(saved.compact),
    layoutDensity: saved.layoutDensity === "compact" ? "compact" : "comfortable",
    glowIntensity: Math.min(100, Math.max(0, Number(saved.glowIntensity) || 70)),
    fontScale: Math.min(1.2, Math.max(0.85, Number(saved.fontScale) || 1)),
    radius: Math.min(32, Math.max(12, Number(saved.radius) || 20)),
    animationIntensity: saved.animationIntensity === "reduced" ? "reduced" : "full",
    respectReducedMotion: saved.respectReducedMotion !== false,
    scrollBehavior: saved.scrollBehavior === "instant" ? "instant" : "smooth",
    showEmail: saved.showEmail !== false,
    showActivity: saved.showActivity !== false,
    publicProfile: saved.publicProfile !== false,
    showPurchases: saved.showPurchases !== false
  };
}

function setAccountPrefs(userId, prefs) {
  if (!userId) {
    return;
  }

  const current = getAccountPrefs(userId);
  const merged = {
    ...current,
    ...(prefs && typeof prefs === "object" ? prefs : {})
  };

  const prefsMap = getAccountPrefsMap();
  prefsMap[userId] = {
    displayName: String(merged.displayName || ""),
    bio: String(merged.bio || ""),
    accent: String(merged.accent || ""),
    profileImage: normalizeProfileImageData(merged.profileImage),
    compact: Boolean(merged.compact),
    layoutDensity: merged.layoutDensity === "compact" ? "compact" : "comfortable",
    glowIntensity: Math.min(100, Math.max(0, Number(merged.glowIntensity) || 70)),
    fontScale: Math.min(1.2, Math.max(0.85, Number(merged.fontScale) || 1)),
    radius: Math.min(32, Math.max(12, Number(merged.radius) || 20)),
    animationIntensity: merged.animationIntensity === "reduced" ? "reduced" : "full",
    respectReducedMotion: merged.respectReducedMotion !== false,
    scrollBehavior: merged.scrollBehavior === "instant" ? "instant" : "smooth",
    showEmail: merged.showEmail !== false,
    showActivity: merged.showActivity !== false,
    publicProfile: merged.publicProfile !== false,
    showPurchases: merged.showPurchases !== false
  };
  saveAccountPrefsMap(prefsMap);
}

function getAllBooks() {
  return [...DEFAULT_BOOKS, ...getCustomBooks()];
}

function findBookById(id) {
  return getAllBooks().find((book) => book.id === id);
}

function findCategoryBySlug(slug) {
  return CATEGORIES.find((category) => CATEGORY_SLUGS[category] === slug) || null;
}

function getFeaturedByCategory(category, count = 3) {
  return getAllBooks()
    .filter((book) => book.category === category && Boolean(book.featured))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, count);
}

function getBooksByCategory(category) {
  return getAllBooks()
    .filter((book) => book.category === category)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function setStatus(target, message, isError) {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.style.color = isError ? "#b52a4f" : "#376a84";
}

function hashFallback(text) {
  let hash = 0;
  const source = String(text || "");

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }

  return `fallback-${Math.abs(hash)}`;
}

async function hashPassword(password) {
  try {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const encoded = new TextEncoder().encode(String(password));
      const digest = await window.crypto.subtle.digest("SHA-256", encoded);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch (error) {
    // fallback below
  }

  return hashFallback(password);
}

function validatePdfFile(file) {
  if (!file) {
    return false;
  }

  const extensionOk = file.name.toLowerCase().endsWith(".pdf");
  const typeOk = file.type === "application/pdf" || file.type === "";
  return extensionOk && typeOk;
}

function validateImageFile(file) {
  if (!file) {
    return false;
  }
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return true;
  }
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(String(file.name || ""));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Could not read selected file."));
    };

    reader.readAsDataURL(file);
  });
}

async function ensureAdminSeed() {
  const users = getUsers();
  const adminEmail = normalizeEmail(ADMIN_ACCOUNT.email);
  const passHash = await hashPassword(ADMIN_ACCOUNT.password);
  const index = users.findIndex((user) => normalizeEmail(user.email) === adminEmail);

  if (index >= 0) {
    const current = users[index] || {};
    users[index] = {
      ...current,
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      passHash,
      role: "owner",
      createdAt: current.createdAt || new Date().toISOString()
    };
    saveUsers(users);
    return;
  }

  users.push({
    id: createId("user"),
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    passHash,
    role: "owner",
    createdAt: new Date().toISOString()
  });
  saveUsers(users);
}

function getInitials(name, fallback = "EZ") {
  const parts = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase());

  return parts.length ? parts.join("") : fallback;
}

function applyAvatarVisual(element, imageData, fallbackText) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const safeFallback = String(fallbackText || "DP");
  const safeImage = normalizeProfileImageData(imageData);

  if (safeImage) {
    const escaped = safeImage.replaceAll('"', "%22").replaceAll("'", "%27");
    element.classList.add("has-image");
    element.style.backgroundImage = `url("${escaped}")`;
    element.textContent = safeFallback;
    element.setAttribute("aria-label", "Profile image");
    return;
  }

  element.classList.remove("has-image");
  element.style.removeProperty("background-image");
  element.textContent = safeFallback;
  element.removeAttribute("aria-label");
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
}

function applyUserAccent() {
  const session = getSession();
  if (!session) {
    document.documentElement.style.removeProperty("--primary");
    return;
  }

  const prefs = getAccountPrefs(session.id);
  if (isHexColor(prefs.accent)) {
    document.documentElement.style.setProperty("--primary", prefs.accent);
  } else {
    document.documentElement.style.removeProperty("--primary");
  }
}

function getPreferredTheme() {
  // Ignore browser/system auto color preference.
  return "dark";
}

function getStoredTheme() {
  const stored = readStorage(STORAGE_KEYS.theme, "");
  return stored === "dark" || stored === "light" ? stored : "";
}

function themeIconSvg(kind) {
  if (kind === "moon") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 14.2A9 9 0 1 1 9.8 3.1a.8.8 0 0 1 1 .95A7 7 0 0 0 19.95 13a.8.8 0 0 1 .95 1.2z" fill="currentColor"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8-5a1 1 0 0 1 0 2h-1.2a1 1 0 1 1 0-2H20zM6.2 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1.2a1 1 0 0 1 1 1zm9.14-5.54a1 1 0 0 1 0-1.42l.86-.85a1 1 0 1 1 1.41 1.41l-.85.86a1 1 0 0 1-1.42 0zM7.23 14.65a1 1 0 0 1 1.41 0 1 1 0 0 1 0 1.41l-.86.86a1 1 0 0 1-1.41-1.42l.86-.85zm9.82 2.27-.86-.86a1 1 0 1 1 1.41-1.41l.85.86a1 1 0 1 1-1.4 1.4zM7.23 9.35l-.86-.86a1 1 0 0 1 1.41-1.41l.86.86A1 1 0 0 1 7.23 9.35zM12 17.8a1 1 0 0 1 1 1V20a1 1 0 1 1-2 0v-1.2a1 1 0 0 1 1-1z" fill="currentColor"/></svg>';
}

function ensureNavThemeToggle() {
  document.querySelectorAll(".main-nav").forEach((nav) => {
    if (nav.querySelector("[data-theme-toggle]")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle-circle";
    button.setAttribute("data-theme-toggle", "1");
    button.innerHTML = `<span class="theme-icon" aria-hidden="true">${themeIconSvg("sun")}</span>`;

    const contact = Array.from(nav.querySelectorAll("a.nav-link")).find((link) => {
      return String(link.textContent || "").trim().toLowerCase() === "contact";
    });

    if (contact) {
      contact.insertAdjacentElement("afterend", button);
      return;
    }
    nav.appendChild(button);
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      toggleTheme();
    });
  });
}

function updateThemeToggleLabels(theme) {
  const isDark = theme === "dark";
  const nextLabel = isDark ? "light" : "dark";
  const icon = isDark ? themeIconSvg("sun") : themeIconSvg("moon");

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", `Switch to ${nextLabel} mode`);
    button.setAttribute("title", `Switch to ${nextLabel} mode`);
    button.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon}</span>`;
    button.classList.toggle("is-dark-target", !isDark);
    button.classList.toggle("is-light-target", isDark);
  });
}

function applyTheme(theme) {
  const mode = theme === "dark" ? "dark" : "light";
  document.body.setAttribute("data-theme", mode);
  writeStorage(STORAGE_KEYS.theme, mode);
  updateThemeToggleLabels(mode);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function initThemeToggle() {
  ensureNavThemeToggle();
  const saved = getStoredTheme();
  applyTheme(saved || getPreferredTheme());
}

function ensureHeaderScrollIndicator() {
  const header = document.querySelector("header.site-header");
  if (!header) {
    return;
  }
  if (!header.querySelector(".scroll-indicator")) {
    const indicator = document.createElement("div");
    indicator.className = "scroll-indicator";
    indicator.innerHTML = '<span data-scroll-progress></span>';
    header.appendChild(indicator);
  }

  const syncHeaderOffset = () => {
    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-offset", `${headerHeight}px`);
  };

  syncHeaderOffset();
  if (document.body.dataset.headerOffsetBound !== "1") {
    document.body.dataset.headerOffsetBound = "1";
    window.addEventListener("resize", syncHeaderOffset);
    window.addEventListener("load", syncHeaderOffset, { once: true });
    window.setTimeout(syncHeaderOffset, 60);
  }

  const bars = Array.from(document.querySelectorAll("[data-scroll-progress]"));
  const updateProgress = () => {
    const top = window.scrollY || document.documentElement.scrollTop;
    const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(100, Math.max(0, (top / height) * 100));
    bars.forEach((bar) => {
      bar.style.width = `${progress}%`;
    });
  };

  updateProgress();
  if (document.body.dataset.scrollProgressBound !== "1") {
    document.body.dataset.scrollProgressBound = "1";
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }
}

const SCROLL_ANIMATION_SELECTORS = [
  "main .section",
  ".hero-card",
  ".soft-panel",
  ".ebook-card",
  ".show-all-cell",
  ".category-block",
  ".contact-card",
  ".form-card",
  ".cards-grid > article",
  ".discovery-grid > article",
  ".review-item",
  ".stat-card",
  ".menu-log-item",
  ".site-footer"
].join(", ");

let scrollAnimationOrder = 0;

function isScrollAnimationCandidate(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (!element.matches(SCROLL_ANIMATION_SELECTORS)) {
    return false;
  }
  if (element.closest(".modal") || element.closest(".user-menu") || element.closest(".chatbot-window")) {
    return false;
  }
  return true;
}

function markScrollAnimationElement(element, observer) {
  if (!(element instanceof HTMLElement) || element.dataset.scrollAnimReady === "1") {
    return;
  }

  element.dataset.scrollAnimReady = "1";
  element.classList.add("scroll-animate-ready");
  element.style.setProperty("--scroll-stagger", `${Math.min(280, (scrollAnimationOrder % 8) * 32)}ms`);
  scrollAnimationOrder += 1;

  if (observer && typeof observer.observe === "function") {
    observer.observe(element);
  } else {
    element.classList.add("in-view");
  }
}

function collectScrollAnimationTargets(root, observer) {
  if (!root) {
    return;
  }

  if (root instanceof HTMLElement && isScrollAnimationCandidate(root)) {
    markScrollAnimationElement(root, observer);
  }

  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    root.querySelectorAll(SCROLL_ANIMATION_SELECTORS).forEach((element) => {
      if (isScrollAnimationCandidate(element)) {
        markScrollAnimationElement(element, observer);
      }
    });
  }
}

function initUniversalScrollAnimations() {
  if (!document.body || document.body.dataset.scrollAnimationsBound === "1") {
    return;
  }
  document.body.dataset.scrollAnimationsBound = "1";

  let lastY = window.scrollY || document.documentElement.scrollTop || 0;
  const updateScrollDirection = () => {
    const current = window.scrollY || document.documentElement.scrollTop || 0;
    const delta = current - lastY;
    if (Math.abs(delta) < 2) {
      return;
    }

    const isDown = delta > 0;
    document.body.classList.toggle("scrolling-down", isDown);
    document.body.classList.toggle("scrolling-up", !isDown);
    lastY = current;
  };

  updateScrollDirection();
  window.addEventListener("scroll", updateScrollDirection, { passive: true });

  if (!("IntersectionObserver" in window)) {
    collectScrollAnimationTargets(document, null);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      target.classList.toggle("in-view", entry.isIntersecting);
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -10% 0px"
  });

  collectScrollAnimationTargets(document, observer);

  if (!("MutationObserver" in window)) {
    return;
  }

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          collectScrollAnimationTargets(node, observer);
        }
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function closeAccountModal() {
  const overlay = document.querySelector("[data-account-modal-overlay]");
  if (!overlay) {
    return;
  }

  overlay.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function openAccountModal() {
  const overlay = document.querySelector("[data-account-modal-overlay]");
  const session = getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  if (!overlay) {
    return;
  }

  const prefs = getAccountPrefs(session.id);
  const nameInput = overlay.querySelector("[data-account-name]");
  const bioInput = overlay.querySelector("[data-account-bio]");
  const accentInput = overlay.querySelector("[data-account-accent]");
  const emailLabel = overlay.querySelector("[data-account-email]");

  if (nameInput instanceof HTMLInputElement) {
    nameInput.value = prefs.displayName || session.name || "";
  }
  if (bioInput instanceof HTMLTextAreaElement) {
    bioInput.value = prefs.bio || "";
  }
  if (accentInput instanceof HTMLInputElement) {
    accentInput.value = isHexColor(prefs.accent) ? prefs.accent : "#6f68ff";
  }
  if (emailLabel) {
    emailLabel.textContent = session.email;
  }

  overlay.classList.add("open");
  document.body.classList.add("modal-open");
}

function saveAccountProfile(form) {
  const session = getSession();
  if (!session || !(form instanceof HTMLFormElement)) {
    return;
  }

  const status = form.querySelector("[data-account-status]");
  const formData = new FormData(form);
  const displayName = String(formData.get("displayName") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const accent = String(formData.get("accent") || "").trim();

  if (!displayName) {
    setStatus(status, "Display name is required.", true);
    return;
  }

  if (!isHexColor(accent)) {
    setStatus(status, "Please select a valid accent color.", true);
    return;
  }

  const users = getUsers().map((user) => {
    if (user.id !== session.id) {
      return user;
    }
    return {
      ...user,
      name: displayName
    };
  });
  saveUsers(users);

  setSession({
    ...session,
    name: displayName
  });

  setAccountPrefs(session.id, {
    displayName,
    bio,
    accent
  });

  applyUserAccent();
  refreshControlCenter();
  setStatus(status, "Profile updated.", false);

  window.setTimeout(() => {
    closeAccountModal();
  }, 320);
}

function initAccountCustomizationModal() {
  if (!document.body || document.querySelector("[data-account-modal-overlay]")) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "account-modal-overlay";
  wrapper.dataset.accountModalOverlay = "1";
  wrapper.innerHTML = `
    <section class="account-modal glass" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
      <div class="account-modal-head">
        <div>
          <p class="section-label">My Account</p>
          <h3 id="account-modal-title">Customize Profile</h3>
          <p class="info-text">Personalize display name, bio, and accent color.</p>
        </div>
        <button class="modal-close-btn" type="button" data-account-close aria-label="Close account modal">X</button>
      </div>
      <form class="account-form" data-account-form novalidate>
        <div class="field">
          <label for="account-display-name">Display Name</label>
          <input class="input" id="account-display-name" data-account-name name="displayName" type="text" maxlength="44" required>
        </div>
        <div class="field">
          <label for="account-bio">Bio</label>
          <textarea class="textarea" id="account-bio" data-account-bio name="bio" rows="3" maxlength="180" placeholder="Add a short profile bio..."></textarea>
        </div>
        <div class="field">
          <label for="account-accent">Accent Color</label>
          <input class="input color-input" id="account-accent" data-account-accent name="accent" type="color" value="#6f68ff">
        </div>
        <p class="info-text">Signed in as: <strong data-account-email></strong></p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" data-account-close>Cancel</button>
          <button class="btn btn-primary" type="submit">Save Changes</button>
        </div>
        <p class="status" data-account-status aria-live="polite"></p>
      </form>
    </section>
  `;
  document.body.appendChild(wrapper);

  wrapper.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.matches("[data-account-modal-overlay]") || target.closest("[data-account-close]")) {
      closeAccountModal();
    }
  });

  const form = wrapper.querySelector("[data-account-form]");
  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAccountProfile(form);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAccountModal();
    }
  });
}

function closeAllCustomSelects(except) {
  document.querySelectorAll(".custom-select.open").forEach((select) => {
    if (select !== except) {
      select.classList.remove("open");
    }
  });
}

function initCustomSelects() {
  document.querySelectorAll("select.select").forEach((nativeSelect) => {
    if (!(nativeSelect instanceof HTMLSelectElement) || nativeSelect.dataset.customized === "1") {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    nativeSelect.parentNode?.insertBefore(wrapper, nativeSelect);
    wrapper.appendChild(nativeSelect);

    nativeSelect.classList.add("native-select-hidden");
    nativeSelect.dataset.customized = "1";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.innerHTML = `<span></span><span class="custom-select-chevron" aria-hidden="true"></span>`;
    wrapper.appendChild(trigger);

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";
    menu.setAttribute("role", "listbox");
    wrapper.appendChild(menu);

    const renderOptions = () => {
      const selectedValue = nativeSelect.value;
      const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
      const labelSlot = trigger.querySelector("span");
      if (labelSlot) {
        labelSlot.textContent = selectedOption ? selectedOption.textContent || "" : "Select";
      }

      menu.innerHTML = Array.from(nativeSelect.options).map((option) => {
        const selectedClass = option.value === selectedValue ? "selected" : "";
        return `<button class="custom-select-option ${selectedClass}" type="button" role="option" data-value="${escapeHtml(option.value)}">${escapeHtml(option.textContent || "")}</button>`;
      }).join("");
    };

    renderOptions();

    trigger.addEventListener("click", () => {
      const willOpen = !wrapper.classList.contains("open");
      closeAllCustomSelects(wrapper);
      wrapper.classList.toggle("open", willOpen);
    });

    menu.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const optionBtn = target.closest(".custom-select-option");
      if (!optionBtn) {
        return;
      }

      const value = optionBtn.getAttribute("data-value") || "";
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      wrapper.classList.remove("open");
      renderOptions();
    });

    nativeSelect.addEventListener("change", () => {
      renderOptions();
    });
  });

  if (document.body.dataset.customSelectBound === "1") {
    return;
  }

  document.body.dataset.customSelectBound = "1";
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".custom-select")) {
      closeAllCustomSelects();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllCustomSelects();
    }
  });
}

function initCustomFileInputs() {
  document.querySelectorAll('input[type="file"].file-input').forEach((nativeInput) => {
    if (!(nativeInput instanceof HTMLInputElement) || nativeInput.dataset.customized === "1") {
      return;
    }

    nativeInput.dataset.customized = "1";
    const wrapper = document.createElement("div");
    wrapper.className = "custom-file-control";

    const ui = document.createElement("div");
    ui.className = "custom-file-ui";
    ui.innerHTML = `
      <button class="btn btn-ghost small custom-file-trigger" type="button">Choose File</button>
      <span class="custom-file-name">No file selected</span>
    `;

    const parent = nativeInput.parentNode;
    if (!parent) {
      return;
    }

    parent.insertBefore(wrapper, nativeInput);
    wrapper.appendChild(nativeInput);
    wrapper.appendChild(ui);

    nativeInput.classList.add("custom-file-native");
    const trigger = ui.querySelector(".custom-file-trigger");
    const nameLabel = ui.querySelector(".custom-file-name");

    const buttonLabel = String(nativeInput.getAttribute("data-file-label") || "").trim();
    const emptyLabel = String(nativeInput.getAttribute("data-file-placeholder") || "No file selected").trim();
    if (trigger) {
      trigger.textContent = buttonLabel || "Choose File";
    }

    const updateLabel = () => {
      const files = nativeInput.files ? Array.from(nativeInput.files) : [];
      if (!files.length) {
        if (nameLabel) {
          nameLabel.textContent = emptyLabel;
        }
        wrapper.classList.remove("has-file");
        return;
      }

      if (nameLabel) {
        nameLabel.textContent = files.length > 1
          ? `${files.length} files selected`
          : String(files[0].name || "Selected file");
      }
      wrapper.classList.add("has-file");
    };

    if (trigger instanceof HTMLButtonElement) {
      trigger.addEventListener("click", () => {
        nativeInput.click();
      });
    }

    nativeInput.addEventListener("change", updateLabel);
    updateLabel();
  });
}

function socialIconSvg(kind) {
  if (kind === "instagram") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.6" r="1"></circle></svg>';
  }

  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="3"></rect><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"></path></svg>';
}

function normalizeSocialLabel(link) {
  const aria = String(link.getAttribute("aria-label") || "").trim().toLowerCase();
  if (aria.includes("instagram")) {
    return "instagram";
  }
  if (aria.includes("youtube")) {
    return "youtube";
  }

  const text = String(link.textContent || "").trim().toLowerCase();
  if (text === "instagram") {
    return "instagram";
  }
  if (text === "youtube") {
    return "youtube";
  }

  return "";
}

function initSocialLinks() {
  document.querySelectorAll("a").forEach((link) => {
    const kind = normalizeSocialLabel(link);
    if (!kind) {
      return;
    }

    if (kind === "instagram") {
      link.setAttribute("href", SOCIAL_LINKS.instagram);
    } else if (kind === "youtube") {
      link.setAttribute("href", SOCIAL_LINKS.youtube);
    }

    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
  });

  document.querySelectorAll(".site-footer .footer-links").forEach((group) => {
    const socialLinks = Array.from(group.querySelectorAll("a"))
      .filter((link) => normalizeSocialLabel(link));

    if (!socialLinks.length) {
      return;
    }

    group.classList.add("footer-social");

    socialLinks.forEach((link) => {
      const kind = normalizeSocialLabel(link);
      const label = kind === "instagram" ? "Instagram" : "YouTube";

      if (link.dataset.socialIconReady === "1") {
        return;
      }

      link.classList.add("footer-social-link");
      link.innerHTML = `${socialIconSvg(kind)}<span>${label}</span>`;
      link.dataset.socialIconReady = "1";
    });
  });
}

function clampValue(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.min(max, Math.max(min, numeric));
}

function detectBanglaText(value) {
  return /[\u0980-\u09FF]/.test(String(value || ""));
}

function sanitizeChatHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, window.location.href);
    const protocol = String(url.protocol || "").toLowerCase();
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function isExternalChatHref(href) {
  const safe = sanitizeChatHref(href);
  if (!safe) {
    return false;
  }
  try {
    const url = new URL(safe, window.location.href);
    return url.protocol === "mailto:" || url.origin !== window.location.origin;
  } catch (error) {
    return false;
  }
}

function normalizeChatLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => {
      const label = String(link && link.label ? link.label : "").trim();
      const href = sanitizeChatHref(link && link.href ? link.href : "");
      if (!label || !href) {
        return null;
      }
      return {
        label: label.slice(0, 80),
        href
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function getChatbotHistory() {
  const stored = readStorage(STORAGE_KEYS.chatbotHistory, []);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const role = String(entry.role || "").toLowerCase() === "user" ? "user" : "assistant";
      const text = String(entry.text || "").trim();
      if (!text) {
        return null;
      }
      return {
        id: String(entry.id || createId("chat")).slice(0, 80),
        role,
        text: text.slice(0, 2500),
        time: String(entry.time || new Date().toISOString()),
        links: normalizeChatLinks(entry.links)
      };
    })
    .filter(Boolean)
    .slice(-80);
}

function saveChatbotHistory(history) {
  const safe = Array.isArray(history) ? history.slice(-80) : [];
  writeStorage(STORAGE_KEYS.chatbotHistory, safe);
}

function getChatbotState() {
  const fallback = {
    open: false,
    minimized: false,
    width: 380,
    height: 520,
    x: null,
    y: null
  };

  const stored = readStorage(STORAGE_KEYS.chatbotState, fallback);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return { ...fallback };
  }

  const width = Number.isFinite(Number(stored.width)) ? clampValue(stored.width, 320, 560) : fallback.width;
  const height = Number.isFinite(Number(stored.height)) ? clampValue(stored.height, 360, 720) : fallback.height;
  const x = Number.isFinite(Number(stored.x)) ? Number(stored.x) : null;
  const y = Number.isFinite(Number(stored.y)) ? Number(stored.y) : null;

  return {
    open: Boolean(stored.open),
    minimized: Boolean(stored.minimized),
    width,
    height,
    x,
    y
  };
}

function saveChatbotState(state) {
  const source = state && typeof state === "object" ? state : {};
  writeStorage(STORAGE_KEYS.chatbotState, {
    open: Boolean(source.open),
    minimized: Boolean(source.minimized),
    width: clampValue(source.width, 320, 560),
    height: clampValue(source.height, 360, 720),
    x: Number.isFinite(Number(source.x)) ? Number(source.x) : null,
    y: Number.isFinite(Number(source.y)) ? Number(source.y) : null
  });
}

function getChatbotHeaderOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-offset");
  const parsed = Number.parseInt(String(raw || "").replace("px", "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 74;
}

function getChatbotWelcomeEntry() {
  return {
    id: createId("chat"),
    role: "assistant",
    text: "Hi! I am e-Zone AI. Ask me about categories, featured books, how to buy, or contact links.",
    time: new Date().toISOString(),
    links: [
      { label: "Browse Books", href: "books.html" },
      { label: "Contact e-Zone", href: "contact.html" }
    ]
  };
}

function formatChatText(text) {
  return escapeHtml(String(text || "")).replace(/\r\n|\n|\r/g, "<br>");
}

function createChatMessageElement(entry) {
  const role = entry && entry.role === "user" ? "user" : "assistant";
  const article = document.createElement("article");
  article.className = `chatbot-message ${role}`;
  article.innerHTML = `
    <p class="chatbot-message-text">${formatChatText(entry && entry.text ? entry.text : "")}</p>
  `;

  const links = normalizeChatLinks(entry && entry.links ? entry.links : []);
  if (links.length) {
    const list = document.createElement("div");
    list.className = "chatbot-message-links";
    links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.className = "chatbot-link";
      anchor.href = link.href;
      anchor.textContent = link.label;
      if (isExternalChatHref(link.href)) {
        anchor.target = "_blank";
        anchor.rel = "noopener";
      }
      list.appendChild(anchor);
    });
    article.appendChild(list);
  }

  return article;
}

function scrollChatToBottom(messagesEl) {
  if (!(messagesEl instanceof HTMLElement)) {
    return;
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderChatbotHistory(messagesEl, history) {
  if (!(messagesEl instanceof HTMLElement)) {
    return;
  }

  messagesEl.innerHTML = "";
  history.forEach((entry) => {
    messagesEl.appendChild(createChatMessageElement(entry));
  });
  scrollChatToBottom(messagesEl);
}

function buildBookLinks(books, max = 4) {
  return books.slice(0, max).map((book) => ({
    label: `${book.title}`,
    href: `book.html?id=${encodeURIComponent(book.id)}`
  }));
}

function detectCategoryFromQuery(queryLower) {
  const map = [
    {
      category: "Love and Romance",
      words: ["love", "romance", "romantic", "relationship"]
    },
    {
      category: "Fiction",
      words: ["fiction", "novel", "story"]
    },
    {
      category: "Biography",
      words: ["biography", "biography", "self help", "biography", "history"]
    },
    {
      category: "Science and Tech",
      words: ["science and tech", "sci-fi", "scifi", "space", "future"]
    }
  ];

  const found = map.find((entry) => entry.words.some((word) => queryLower.includes(word)));
  return found ? found.category : null;
}

function getLocalChatbotReply(message) {
  const query = String(message || "").trim();
  const queryLower = query.toLowerCase();
  const isBangla = detectBanglaText(query);
  const allBooks = getAllBooks();
  const featuredBooks = allBooks
    .filter((book) => Boolean(book.featured))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const activeBookId = new URLSearchParams(window.location.search).get("id");
  const activeBook = findBookById(activeBookId);
  const categoryFromQuery = detectCategoryFromQuery(queryLower);
  const greetingHint = queryLower.includes("hi")
    || queryLower.includes("hello")
    || queryLower.includes("hey")
    || queryLower.includes("assalamu")
    || query.includes("হাই")
    || query.includes("হ্যালো");

  if (greetingHint) {
    return isBangla
      ? {
        text: "হাই! আমি e-Zone AI। বই, ক্যাটাগরি, কেনার নিয়ম বা সাপোর্ট নিয়ে প্রশ্ন করুন।",
        links: [
          { label: "বই দেখুন", href: "books.html" },
          { label: "যোগাযোগ", href: "contact.html" }
        ]
      }
      : {
        text: "Hey! I am e-Zone AI. Ask me about books, categories, buying steps, or support links.",
        links: [
          { label: "Browse Books", href: "books.html" },
          { label: "Contact", href: "contact.html" }
        ]
      };
  }

  if (
    queryLower.includes("buy")
    || queryLower.includes("purchase")
    || queryLower.includes("payment")
    || queryLower.includes("bkash")
    || query.includes("কিভাবে")
    || query.includes("কীভাবে")
    || query.includes("কেনা")
    || query.includes("পেমেন্ট")
  ) {
    const links = activeBook
      ? [{ label: `Open ${activeBook.title}`, href: `book.html?id=${encodeURIComponent(activeBook.id)}` }]
      : [{ label: "Open Books Page", href: "books.html" }];

    return isBangla
      ? {
        text: "বই কিনতে: 1) বই খুলুন 2) বই পাতায় দেয়া ধাপগুলো অনুসরণ করুন 3) সোর্স লিংক/QR থেকে পেমেন্ট সম্পন্ন করুন। দরকার হলে আমি বই লিংকও দিতে পারি।",
        links
      }
      : {
        text: "Buying flow is simple: 1) Open a book 2) Follow the steps on the book page 3) Complete payment using the listed source link/QR. I can also share direct book links.",
        links
      };
  }

  if (
    queryLower.includes("faq")
    || queryLower.includes("help")
    || queryLower.includes("what can you do")
    || query.includes("সহায়তা")
    || query.includes("সহায়তা")
    || query.includes("হেল্প")
  ) {
    return isBangla
      ? {
        text: "আমি সাহায্য করতে পারি: ক্যাটাগরি দেখানো, ফিচার্ড বই সাজেস্ট করা, কেনার ধাপ বুঝানো, এবং Instagram/YouTube/Contact লিংক দেয়া।",
        links: [
          { label: "Books", href: "books.html" },
          { label: "Contact", href: "contact.html" },
          { label: "YouTube", href: SOCIAL_LINKS.youtube },
          { label: "Instagram", href: SOCIAL_LINKS.instagram }
        ]
      }
      : {
        text: "I can help with categories, featured books, purchase steps, FAQs, and quick links for Contact, YouTube, and Instagram.",
        links: [
          { label: "Books", href: "books.html" },
          { label: "Contact", href: "contact.html" },
          { label: "YouTube", href: SOCIAL_LINKS.youtube },
          { label: "Instagram", href: SOCIAL_LINKS.instagram }
        ]
      };
  }

  if (
    queryLower.includes("instagram")
    || queryLower.includes("youtube")
    || queryLower.includes("social")
    || query.includes("ইনস্টা")
    || query.includes("ইউটিউব")
  ) {
    return isBangla
      ? {
        text: "এখানে e-Zone সোশ্যাল লিংকগুলো:",
        links: [
          { label: "YouTube", href: SOCIAL_LINKS.youtube },
          { label: "Instagram", href: SOCIAL_LINKS.instagram }
        ]
      }
      : {
        text: "Here are the official e-Zone social links:",
        links: [
          { label: "YouTube", href: SOCIAL_LINKS.youtube },
          { label: "Instagram", href: SOCIAL_LINKS.instagram }
        ]
      };
  }

  if (
    queryLower.includes("contact")
    || queryLower.includes("owner")
    || queryLower.includes("admin")
    || queryLower.includes("email")
    || query.includes("যোগাযোগ")
  ) {
    return isBangla
      ? {
        text: "সাপোর্ট লাগলে যোগাযোগ করুন: abirxxdbrine2024@gmail.com",
        links: [
          { label: "Email Owner", href: "mailto:abirxxdbrine2024@gmail.com" },
          { label: "Contact Page", href: "contact.html" }
        ]
      }
      : {
        text: "For support, contact the owner at abirxxdbrine2024@gmail.com",
        links: [
          { label: "Email Owner", href: "mailto:abirxxdbrine2024@gmail.com" },
          { label: "Contact Page", href: "contact.html" }
        ]
      };
  }

  if (categoryFromQuery) {
    const categoryBooks = getBooksByCategory(categoryFromQuery);
    const picks = categoryBooks.filter((book) => Boolean(book.featured)).slice(0, 4);
    const fallbackPicks = picks.length ? picks : categoryBooks.slice(0, 4);
    const links = [
      ...buildBookLinks(fallbackPicks, 4),
      { label: `Show all ${categoryFromQuery}`, href: `category.html?category=${encodeURIComponent(CATEGORY_SLUGS[categoryFromQuery])}` }
    ];

    if (!categoryBooks.length) {
      return isBangla
        ? {
          text: `${categoryFromQuery} ক্যাটাগরিতে এখনো বই যোগ হয়নি।`,
          links: [{ label: "Books Page", href: "books.html" }]
        }
        : {
          text: `No books are uploaded in ${categoryFromQuery} yet.`,
          links: [{ label: "Books Page", href: "books.html" }]
        };
    }

    return isBangla
      ? {
        text: `${categoryFromQuery} ক্যাটাগরিতে ${categoryBooks.length}টি বই আছে। নিচে জনপ্রিয়/ফিচার্ড বই দেখুন।`,
        links
      }
      : {
        text: `${categoryFromQuery} currently has ${categoryBooks.length} books. Here are the top picks.`,
        links
      };
  }

  if (queryLower.includes("featured") || queryLower.includes("popular") || query.includes("ফিচার্ড")) {
    if (!featuredBooks.length) {
      return isBangla
        ? {
          text: "এখনো কোনো featured বই সেট করা হয়নি।",
          links: [{ label: "Books Page", href: "books.html" }]
        }
        : {
          text: "No featured books are marked yet.",
          links: [{ label: "Books Page", href: "books.html" }]
        };
    }

    return isBangla
      ? {
        text: "এখানে বর্তমান featured বইগুলো:",
        links: buildBookLinks(featuredBooks, 6)
      }
      : {
        text: "Here are the current featured books:",
        links: buildBookLinks(featuredBooks, 6)
      };
  }

  if (
    queryLower.includes("category")
    || queryLower.includes("categories")
    || query.includes("ক্যাটাগরি")
    || query.includes("ক্যাটেগরি")
  ) {
    return isBangla
      ? {
        text: "e-Zone এর ক্যাটাগরিগুলো:",
        links: CATEGORIES.map((category) => ({
          label: category,
          href: `category.html?category=${encodeURIComponent(CATEGORY_SLUGS[category])}`
        }))
      }
      : {
        text: "These are the available e-Zone categories:",
        links: CATEGORIES.map((category) => ({
          label: category,
          href: `category.html?category=${encodeURIComponent(CATEGORY_SLUGS[category])}`
        }))
      };
  }

  if (queryLower.includes("book") || queryLower.includes("books") || query.includes("বই")) {
    if (!allBooks.length) {
      return isBangla
        ? {
          text: "এখনো কোনো বই আপলোড হয়নি। পরে আবার দেখুন।",
          links: [{ label: "Books Page", href: "books.html" }]
        }
        : {
          text: "No books are uploaded yet. Please check again soon.",
          links: [{ label: "Books Page", href: "books.html" }]
        };
    }

    const recent = [...allBooks]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 5);

    return isBangla
      ? {
        text: `এখন মোট ${allBooks.length}টি বই আছে। নতুন আপলোডগুলো দেখুন:`,
        links: buildBookLinks(recent, 5)
      }
      : {
        text: `There are ${allBooks.length} books right now. Check these recent uploads:`,
        links: buildBookLinks(recent, 5)
      };
  }

  if (!allBooks.length) {
    return isBangla
      ? {
        text: "আমি সাহায্য করতে প্রস্তুত। এখনো বই আপলোড হয়নি, তবে আপনি ক্যাটাগরি, কেনার ধাপ, বা কন্টাক্ট নিয়ে প্রশ্ন করতে পারেন।",
        links: [
          { label: "Books Page", href: "books.html" },
          { label: "Contact", href: "contact.html" }
        ]
      }
      : {
        text: "I am ready to help. No books are uploaded yet, but you can ask me about categories, buying steps, or support contacts.",
        links: [
          { label: "Books Page", href: "books.html" },
          { label: "Contact", href: "contact.html" }
        ]
      };
  }

  return isBangla
    ? {
      text: "দারুণ প্রশ্ন। বই, ক্যাটাগরি, featured তালিকা, বা buying steps নিয়ে জিজ্ঞেস করুন, আমি সাথে সাথে সাজেস্ট করব।",
      links: [
        { label: "Featured Books", href: "books.html" },
        { label: "All Categories", href: "books.html" }
      ]
    }
    : {
      text: "Nice question. Ask me about books, categories, featured picks, or buying steps and I will guide you instantly.",
      links: [
        { label: "Featured Books", href: "books.html" },
        { label: "All Categories", href: "books.html" }
      ]
    };
}

function getChatbotConfig() {
  // Optional runtime config:
  // window.EZONE_CHATBOT_CONFIG = { endpoint: "https://your-backend/chat", authToken: "", timeoutMs: 12000 };
  const raw = window.EZONE_CHATBOT_CONFIG;
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const timeoutMs = Number.isFinite(Number(source.timeoutMs))
    ? clampValue(source.timeoutMs, 3000, 30000)
    : 12000;
  return {
    endpoint: String(source.endpoint || "").trim(),
    authToken: String(source.authToken || "").trim(),
    timeoutMs
  };
}

async function requestRemoteChatbotReply(message, history) {
  const config = getChatbotConfig();
  if (!config.endpoint) {
    return null;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, config.timeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (config.authToken) {
      headers.Authorization = `Bearer ${config.authToken}`;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: String(message || ""),
        history: Array.isArray(history)
          ? history.slice(-10).map((entry) => ({
            role: entry.role === "user" ? "user" : "assistant",
            text: String(entry.text || "")
          }))
          : [],
        context: {
          page: window.location.pathname,
          categories: CATEGORIES,
          totalBooks: getAllBooks().length,
          featuredBooks: getAllBooks().filter((book) => Boolean(book.featured)).length
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    const text = String(
      payload.reply
      || payload.message
      || payload.output
      || payload.text
      || ""
    ).trim();

    if (!text) {
      return null;
    }

    return {
      text: text.slice(0, 2600),
      links: normalizeChatLinks(payload.links)
    };
  } catch (error) {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function generateChatbotReply(message, history) {
  const remote = await requestRemoteChatbotReply(message, history);
  if (remote && remote.text) {
    return remote;
  }
  return getLocalChatbotReply(message);
}

function ensureChatbotWidget() {
  const existing = document.querySelector("[data-chatbot-shell]");
  if (existing) {
    return existing;
  }

  const shell = document.createElement("section");
  shell.className = "chatbot-shell";
  shell.dataset.chatbotShell = "1";
  shell.innerHTML = `
    <button class="chatbot-launcher" type="button" data-chatbot-toggle aria-label="Open e-Zone AI assistant">
      <span class="chatbot-launcher-icon" aria-hidden="true">AI</span>
      <span class="chatbot-launcher-text">Ask e-Zone AI</span>
    </button>

    <section class="chatbot-window glass" data-chatbot-window aria-hidden="true">
      <header class="chatbot-head" data-chatbot-drag>
        <div class="chatbot-head-main">
          <span class="chatbot-status-dot" aria-hidden="true"></span>
          <div>
            <strong>e-Zone AI</strong>
            <p>Friendly futuristic assistant</p>
          </div>
        </div>
        <div class="chatbot-head-actions">
          <button class="chatbot-head-btn" type="button" data-chatbot-minimize aria-label="Minimize chat">_</button>
          <button class="chatbot-head-btn" type="button" data-chatbot-close aria-label="Close chat">&times;</button>
        </div>
      </header>

      <div class="chatbot-messages" data-chatbot-messages></div>

      <div class="chatbot-typing hidden" data-chatbot-typing>
        <span>AI is typing</span>
        <span class="chatbot-dot-flow" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>

      <form class="chatbot-form" data-chatbot-form novalidate>
        <input class="input chatbot-input" data-chatbot-input type="text" maxlength="600" placeholder="Ask about books, buying steps, FAQs..." autocomplete="off">
        <button class="btn btn-primary chatbot-send" data-chatbot-send type="submit">Send</button>
      </form>

      <div class="chatbot-resizer" data-chatbot-resizer aria-hidden="true"></div>
    </section>
  `;

  document.body.appendChild(shell);
  return shell;
}

function applyChatbotState(shell, state) {
  if (!(shell instanceof HTMLElement)) {
    return;
  }

  const launcher = shell.querySelector("[data-chatbot-toggle]");
  const windowEl = shell.querySelector("[data-chatbot-window]");
  if (!(launcher instanceof HTMLButtonElement) || !(windowEl instanceof HTMLElement)) {
    return;
  }

  const isMobile = window.innerWidth <= 760;
  if (isMobile) {
    state.x = null;
    state.y = null;
    shell.classList.remove("is-custom-pos");
    windowEl.style.removeProperty("left");
    windowEl.style.removeProperty("top");
    windowEl.style.removeProperty("right");
    windowEl.style.removeProperty("bottom");
    windowEl.style.removeProperty("width");
    windowEl.style.removeProperty("height");
  } else {
    state.width = clampValue(state.width, 320, Math.max(340, window.innerWidth - 24));
    state.height = clampValue(state.height, 360, Math.max(380, window.innerHeight - 32));
    windowEl.style.width = `${state.width}px`;
    windowEl.style.height = `${state.height}px`;

    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
      const minY = getChatbotHeaderOffset() + 8;
      const maxX = Math.max(8, window.innerWidth - state.width - 8);
      const maxY = Math.max(minY, window.innerHeight - state.height - 8);
      state.x = clampValue(state.x, 8, maxX);
      state.y = clampValue(state.y, minY, maxY);

      shell.classList.add("is-custom-pos");
      windowEl.style.left = `${state.x}px`;
      windowEl.style.top = `${state.y}px`;
      windowEl.style.right = "auto";
      windowEl.style.bottom = "auto";
    } else {
      shell.classList.remove("is-custom-pos");
      windowEl.style.removeProperty("left");
      windowEl.style.removeProperty("top");
      windowEl.style.removeProperty("right");
      windowEl.style.removeProperty("bottom");
    }
  }

  shell.classList.toggle("open", Boolean(state.open));
  shell.classList.toggle("minimized", Boolean(state.open && state.minimized));
  windowEl.setAttribute("aria-hidden", state.open ? "false" : "true");
  launcher.setAttribute("aria-expanded", state.open ? "true" : "false");
}

function bindChatbotDrag(shell, state) {
  const handle = shell.querySelector("[data-chatbot-drag]");
  const windowEl = shell.querySelector("[data-chatbot-window]");
  if (!(handle instanceof HTMLElement) || !(windowEl instanceof HTMLElement)) {
    return;
  }

  let dragRef = null;

  const onPointerMove = (event) => {
    if (!dragRef) {
      return;
    }
    const minY = getChatbotHeaderOffset() + 8;
    const nextX = dragRef.startX + (event.clientX - dragRef.pointerX);
    const nextY = dragRef.startY + (event.clientY - dragRef.pointerY);
    const maxX = Math.max(8, window.innerWidth - dragRef.width - 8);
    const maxY = Math.max(minY, window.innerHeight - dragRef.height - 8);

    state.x = clampValue(nextX, 8, maxX);
    state.y = clampValue(nextY, minY, maxY);
    shell.classList.add("is-custom-pos");
    windowEl.style.left = `${state.x}px`;
    windowEl.style.top = `${state.y}px`;
    windowEl.style.right = "auto";
    windowEl.style.bottom = "auto";
  };

  const onPointerUp = () => {
    if (!dragRef) {
      return;
    }
    dragRef = null;
    shell.classList.remove("chatbot-dragging");
    saveChatbotState(state);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (window.innerWidth <= 760 || event.button !== 0) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("button")) {
      return;
    }

    const rect = windowEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    state.width = clampValue(width, 320, Math.max(340, window.innerWidth - 24));
    state.height = clampValue(height, 360, Math.max(380, window.innerHeight - 32));
    state.x = rect.left;
    state.y = rect.top;
    applyChatbotState(shell, state);

    dragRef = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: state.x,
      startY: state.y,
      width: state.width,
      height: state.height
    };

    shell.classList.add("chatbot-dragging");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });
}

function bindChatbotResize(shell, state) {
  const resizer = shell.querySelector("[data-chatbot-resizer]");
  const windowEl = shell.querySelector("[data-chatbot-window]");
  if (!(resizer instanceof HTMLElement) || !(windowEl instanceof HTMLElement)) {
    return;
  }

  let resizeRef = null;

  const onPointerMove = (event) => {
    if (!resizeRef) {
      return;
    }

    const minY = getChatbotHeaderOffset() + 8;
    const maxWidth = Math.max(320, window.innerWidth - 20);
    const maxHeight = Math.max(360, window.innerHeight - minY - 8);
    const width = clampValue(resizeRef.startWidth + (event.clientX - resizeRef.pointerX), 320, maxWidth);
    const height = clampValue(resizeRef.startHeight + (event.clientY - resizeRef.pointerY), 360, maxHeight);

    state.width = width;
    state.height = height;

    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(minY, window.innerHeight - height - 8);
      state.x = clampValue(state.x, 8, maxX);
      state.y = clampValue(state.y, minY, maxY);
      windowEl.style.left = `${state.x}px`;
      windowEl.style.top = `${state.y}px`;
    }

    windowEl.style.width = `${width}px`;
    windowEl.style.height = `${height}px`;
  };

  const onPointerUp = () => {
    if (!resizeRef) {
      return;
    }
    resizeRef = null;
    shell.classList.remove("chatbot-resizing");
    saveChatbotState(state);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  resizer.addEventListener("pointerdown", (event) => {
    if (window.innerWidth <= 760 || event.button !== 0) {
      return;
    }
    const rect = windowEl.getBoundingClientRect();
    resizeRef = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };
    shell.classList.add("chatbot-resizing");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });
}

function initChatbot() {
  if (!document.body || document.body.dataset.chatbotReady === "1") {
    return;
  }

  const shell = ensureChatbotWidget();
  if (!(shell instanceof HTMLElement)) {
    return;
  }

  const launcher = shell.querySelector("[data-chatbot-toggle]");
  const closeBtn = shell.querySelector("[data-chatbot-close]");
  const minimizeBtn = shell.querySelector("[data-chatbot-minimize]");
  const form = shell.querySelector("[data-chatbot-form]");
  const input = shell.querySelector("[data-chatbot-input]");
  const send = shell.querySelector("[data-chatbot-send]");
  const messages = shell.querySelector("[data-chatbot-messages]");
  const typing = shell.querySelector("[data-chatbot-typing]");

  if (
    !(launcher instanceof HTMLButtonElement)
    || !(closeBtn instanceof HTMLButtonElement)
    || !(minimizeBtn instanceof HTMLButtonElement)
    || !(form instanceof HTMLFormElement)
    || !(input instanceof HTMLInputElement)
    || !(send instanceof HTMLButtonElement)
    || !(messages instanceof HTMLElement)
    || !(typing instanceof HTMLElement)
  ) {
    return;
  }

  document.body.dataset.chatbotReady = "1";

  const state = getChatbotState();
  let history = getChatbotHistory();
  if (!history.length) {
    history = [getChatbotWelcomeEntry()];
    saveChatbotHistory(history);
  }

  renderChatbotHistory(messages, history);
  applyChatbotState(shell, state);
  bindChatbotDrag(shell, state);
  bindChatbotResize(shell, state);

  const setTyping = (show) => {
    typing.classList.toggle("hidden", !show);
    if (show) {
      scrollChatToBottom(messages);
    }
  };

  const appendEntry = (entry) => {
    history.push(entry);
    history = history.slice(-80);
    saveChatbotHistory(history);
    messages.appendChild(createChatMessageElement(entry));
    scrollChatToBottom(messages);
  };

  launcher.addEventListener("click", () => {
    state.open = !state.open;
    if (state.open) {
      state.minimized = false;
    }
    applyChatbotState(shell, state);
    saveChatbotState(state);
    if (state.open) {
      window.setTimeout(() => {
        input.focus();
        scrollChatToBottom(messages);
      }, 120);
    }
  });

  closeBtn.addEventListener("click", () => {
    state.open = false;
    state.minimized = false;
    applyChatbotState(shell, state);
    saveChatbotState(state);
  });

  minimizeBtn.addEventListener("click", () => {
    if (!state.open) {
      return;
    }
    state.minimized = !state.minimized;
    applyChatbotState(shell, state);
    saveChatbotState(state);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = String(input.value || "").trim();
    if (!text) {
      return;
    }

    const userEntry = {
      id: createId("chat"),
      role: "user",
      text: text.slice(0, 600),
      time: new Date().toISOString(),
      links: []
    };
    appendEntry(userEntry);

    input.value = "";
    input.disabled = true;
    send.disabled = true;
    setTyping(true);
    const replyStartMs = Date.now();

    let reply;
    try {
      reply = await generateChatbotReply(userEntry.text, history);
    } catch (error) {
      reply = {
        text: "I hit a connection issue. Please try again in a moment.",
        links: []
      };
    }

    const elapsed = Date.now() - replyStartMs;
    if (elapsed < 320) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 320 - elapsed);
      });
    }

    setTyping(false);
    input.disabled = false;
    send.disabled = false;

    const assistantEntry = {
      id: createId("chat"),
      role: "assistant",
      text: String(reply && reply.text ? reply.text : "I am here to help."),
      time: new Date().toISOString(),
      links: normalizeChatLinks(reply && reply.links ? reply.links : [])
    };

    appendEntry(assistantEntry);
    input.focus();
  });

  window.addEventListener("resize", () => {
    applyChatbotState(shell, state);
    saveChatbotState(state);
  });
}

function initChatbotAsync() {
  const boot = () => {
    initChatbot();
  };

  if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(boot, { timeout: 1200 });
    return;
  }
  window.setTimeout(boot, 180);
}

let controlCenterSessionStartMs = Date.now();
let popupModalResolver = null;

function getControlCenterLogs() {
  const logs = readStorage(STORAGE_KEYS.controlCenterLogs, {});
  return logs && typeof logs === "object" && !Array.isArray(logs) ? logs : {};
}

function saveControlCenterLogs(logs) {
  writeStorage(STORAGE_KEYS.controlCenterLogs, logs);
}

function ensureControlLogRecord(userKey) {
  const logs = getControlCenterLogs();
  const existing = logs[userKey];
  if (!existing || typeof existing !== "object") {
    logs[userKey] = {
      visits: 0,
      totalVisitMs: 0,
      purchases: [],
      timeline: [],
      lastVisitAt: ""
    };
    saveControlCenterLogs(logs);
  }
  return getControlCenterLogs()[userKey];
}

function addControlTimeline(userKey, message) {
  const logs = getControlCenterLogs();
  const record = logs[userKey] || {
    visits: 0,
    totalVisitMs: 0,
    purchases: [],
    timeline: [],
    lastVisitAt: ""
  };
  const nextTimeline = Array.isArray(record.timeline) ? record.timeline : [];
  nextTimeline.unshift({
    message: String(message || "Activity"),
    time: new Date().toISOString()
  });
  record.timeline = nextTimeline.slice(0, 18);
  logs[userKey] = record;
  saveControlCenterLogs(logs);
}

function registerControlCenterVisit() {
  const session = getSession();
  if (!session || !session.email) {
    return;
  }

  const userKey = normalizeEmail(session.email);
  const logs = getControlCenterLogs();
  const record = logs[userKey] || {
    visits: 0,
    totalVisitMs: 0,
    purchases: [],
    timeline: [],
    lastVisitAt: ""
  };
  record.visits = Number(record.visits || 0) + 1;
  record.lastVisitAt = new Date().toISOString();
  record.timeline = Array.isArray(record.timeline) ? record.timeline : [];
  record.timeline.unshift({
    message: `Visited ${document.body.dataset.page || "page"}`,
    time: new Date().toISOString()
  });
  record.timeline = record.timeline.slice(0, 18);
  logs[userKey] = record;
  saveControlCenterLogs(logs);
  controlCenterSessionStartMs = Date.now();
}

function persistControlCenterSessionTime() {
  const session = getSession();
  if (!session || !session.email) {
    return;
  }

  const elapsed = Date.now() - controlCenterSessionStartMs;
  if (!Number.isFinite(elapsed) || elapsed <= 0) {
    return;
  }

  const userKey = normalizeEmail(session.email);
  const logs = getControlCenterLogs();
  const record = logs[userKey] || {
    visits: 0,
    totalVisitMs: 0,
    purchases: [],
    timeline: [],
    lastVisitAt: ""
  };
  record.totalVisitMs = Number(record.totalVisitMs || 0) + elapsed;
  logs[userKey] = record;
  saveControlCenterLogs(logs);
  controlCenterSessionStartMs = Date.now();
}

function formatControlDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const totalMinutes = Math.floor(value / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function ensureCybrlyProfileCustomizeModal() {
  if (document.querySelector('[data-modal="profile-customize"]')) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.dataset.modal = "profile-customize";
  modal.innerHTML = `
    <div class="modal-content glass modal-customize">
      <button class="modal-close" type="button" data-close-modal>&times;</button>
      <p class="eyebrow">Profile Studio</p>
      <h3>Customize Profile</h3>
      <p class="muted">Personalize identity, appearance, interface, and privacy with instant live updates.</p>
      <div class="form-message" data-customize-status></div>
      <div class="customize-section">
        <h4>Identity</h4>
        <div class="avatar-upload-row">
          <span class="profile-avatar customize-avatar-preview" data-avatar-preview>DP</span>
          <div class="avatar-upload-actions">
            <label class="btn btn-ghost small avatar-upload-btn">
              Upload PFP
              <input class="native-file-hidden" type="file" accept="image/*" data-avatar-upload>
            </label>
            <button class="btn btn-outline small" type="button" data-avatar-clear>Remove PFP</button>
          </div>
        </div>
        <p class="info-text">Supported: PNG, JPG, WEBP. Max size 2MB.</p>
        <div class="customize-grid">
          <label>
            Display Name (optional)
            <input class="input" type="text" data-pref-field="displayName" maxlength="44" placeholder="Your display name">
          </label>
          <label>
            Bio / Tagline
            <input class="input" type="text" data-pref-field="bio" maxlength="140" placeholder="Short, clean tagline">
          </label>
        </div>
      </div>
      <div class="customize-section">
        <h4>Appearance</h4>
        <div class="customize-grid">
          <label>
            Accent Color
            <input class="input" type="color" data-pref-field="accent" />
          </label>
          <label>
            Glow Intensity
            <div class="range-row">
              <input class="input" type="range" min="0" max="100" step="1" data-pref-field="glowIntensity">
              <span class="range-value" data-range-value="glowIntensity">70%</span>
            </div>
          </label>
          <label>
            Font Scale
            <div class="range-row">
              <input class="input" type="range" min="0.85" max="1.2" step="0.05" data-pref-field="fontScale">
              <span class="range-value" data-range-value="fontScale">1.00x</span>
            </div>
          </label>
          <label>
            Card Radius
            <div class="range-row">
              <input class="input" type="range" min="12" max="32" step="1" data-pref-field="radius">
              <span class="range-value" data-range-value="radius">20px</span>
            </div>
          </label>
          <label>
            Layout Density
            <select class="input select" data-pref-field="layoutDensity">
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="compact" />
            Compact layout toggle
          </label>
        </div>
      </div>
      <div class="customize-section">
        <h4>Interface</h4>
        <div class="customize-grid">
          <label>
            Animation Intensity
            <select class="input select" data-pref-field="animationIntensity">
              <option value="full">Full Motion</option>
              <option value="reduced">Reduced Motion</option>
            </select>
          </label>
          <label>
            Scroll Behavior
            <select class="input select" data-pref-field="scrollBehavior">
              <option value="smooth">Smooth</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="respectReducedMotion" />
            Respect System Reduced Motion
          </label>
        </div>
      </div>
      <div class="customize-section">
        <h4>Privacy</h4>
        <div class="customize-grid">
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="showEmail" />
            Show email in control center
          </label>
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="showActivity" />
            Show activity timeline
          </label>
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="showPurchases" />
            Show purchase list
          </label>
          <label class="toggle-field">
            <input type="checkbox" data-pref-field="publicProfile" />
            Public profile visibility
          </label>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-close-modal>Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function ensurePopupModal() {
  if (document.querySelector('[data-modal="app-popup"]')) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.dataset.modal = "app-popup";
  modal.innerHTML = `
    <div class="modal-content glass modal-popup" data-popup-content data-kind="info">
      <button class="modal-close" type="button" data-popup-close aria-label="Close popup">&times;</button>
      <p class="eyebrow popup-label" data-popup-label>Notice</p>
      <h3 data-popup-title>Notice</h3>
      <p class="muted popup-message" data-popup-message>Message</p>
      <div class="modal-actions popup-actions">
        <button class="btn btn-outline" type="button" data-popup-cancel>Cancel</button>
        <button class="btn btn-primary" type="button" data-popup-confirm>OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll("[data-popup-close], [data-popup-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      hideCybrlyModal(modal, false);
    });
  });

  const confirmButton = modal.querySelector("[data-popup-confirm]");
  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      hideCybrlyModal(modal, true);
    });
  }
}

function resolvePopupModal(result) {
  if (typeof popupModalResolver !== "function") {
    return;
  }
  const resolver = popupModalResolver;
  popupModalResolver = null;
  resolver(Boolean(result));
}

function openPopupModal(options = {}) {
  ensurePopupModal();
  const modal = document.querySelector('[data-modal="app-popup"]');
  if (!modal) {
    return Promise.resolve(false);
  }

  const content = modal.querySelector("[data-popup-content]");
  const label = modal.querySelector("[data-popup-label]");
  const title = modal.querySelector("[data-popup-title]");
  const message = modal.querySelector("[data-popup-message]");
  const confirmButton = modal.querySelector("[data-popup-confirm]");
  const cancelButton = modal.querySelector("[data-popup-cancel]");

  const kindRaw = String(options.kind || "info").toLowerCase();
  const kind = ["info", "success", "warning", "danger"].includes(kindRaw) ? kindRaw : "info";
  const showCancel = Boolean(options.showCancel);

  if (content instanceof HTMLElement) {
    content.dataset.kind = kind;
  }
  if (label) {
    label.textContent = kind === "danger"
      ? "Warning"
      : kind === "success"
        ? "Success"
        : kind === "warning"
          ? "Attention"
          : "Notice";
  }
  if (title) {
    title.textContent = String(options.title || "Notice");
  }
  if (message) {
    message.textContent = String(options.message || "");
  }
  if (confirmButton) {
    confirmButton.textContent = String(options.confirmText || "OK");
  }
  if (cancelButton) {
    cancelButton.textContent = String(options.cancelText || "Cancel");
    cancelButton.classList.toggle("hidden", !showCancel);
  }

  if (typeof popupModalResolver === "function") {
    resolvePopupModal(false);
  }

  return new Promise((resolve) => {
    popupModalResolver = resolve;
    showCybrlyModal("app-popup");
  });
}

function showCybrlyModal(key) {
  const modal = document.querySelector(`[data-modal="${key}"]`);
  if (!modal) {
    return;
  }
  modal.classList.add("show");
  updateControlCenterScrollLock();
}

function hideCybrlyModal(modal, result = false) {
  if (!modal) {
    return;
  }
  modal.classList.remove("show");
  if (modal.dataset.modal === "app-popup") {
    resolvePopupModal(result);
  }
  updateControlCenterScrollLock();
}

function applyCybrlyControlPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") {
    return;
  }
  const compactLayout = prefs.layoutDensity === "compact" || Boolean(prefs.compact);
  document.body.classList.toggle("layout-compact", compactLayout);
  document.body.classList.toggle("hide-email", prefs.showEmail === false);
  document.body.classList.toggle("hide-activity", prefs.showActivity === false);
  document.body.classList.toggle("hide-purchases", prefs.showPurchases === false);
  document.body.classList.toggle("profile-private", prefs.publicProfile === false);

  const scale = Math.min(1.2, Math.max(0.85, Number(prefs.fontScale) || 1));
  const radius = Math.min(32, Math.max(12, Number(prefs.radius) || 20));
  const glow = Math.min(100, Math.max(0, Number(prefs.glowIntensity) || 70));

  document.documentElement.style.fontSize = `${(scale * 100).toFixed(0)}%`;
  document.documentElement.style.setProperty("--radius-xl", `${radius}px`);
  document.documentElement.style.setProperty("--radius-lg", `${Math.max(10, radius - 6)}px`);
  document.documentElement.style.setProperty("--radius-md", `${Math.max(8, radius - 12)}px`);
  document.documentElement.style.setProperty("--control-glow-strength", String((glow / 100).toFixed(2)));

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldReduceMotion = prefs.animationIntensity === "reduced" || (prefs.respectReducedMotion && prefersReduced);
  document.body.classList.toggle("reduce-motion", Boolean(shouldReduceMotion));

  const scrollMode = prefs.scrollBehavior === "instant" ? "auto" : "smooth";
  document.documentElement.style.scrollBehavior = scrollMode;
  document.body.style.scrollBehavior = scrollMode;

  applyUserAccent();
}

function updateRangeReadout(field, value) {
  if (!field) {
    return;
  }
  const key = field.getAttribute("data-pref-field");
  if (!key) {
    return;
  }
  const readout = document.querySelector(`[data-range-value="${key}"]`);
  if (!readout) {
    return;
  }

  if (key === "glowIntensity") {
    readout.textContent = `${Math.round(Number(value) || 0)}%`;
    return;
  }
  if (key === "fontScale") {
    readout.textContent = `${(Number(value) || 1).toFixed(2)}x`;
    return;
  }
  if (key === "radius") {
    readout.textContent = `${Math.round(Number(value) || 0)}px`;
  }
}

function syncCustomizeAvatarState(session, prefs) {
  const preview = document.querySelector('[data-modal="profile-customize"] [data-avatar-preview]');
  const clearButton = document.querySelector('[data-modal="profile-customize"] [data-avatar-clear]');
  if (!preview) {
    return;
  }

  const fallbackName = session
    ? (prefs.displayName || session.name || session.email || "DP")
    : "DP";
  const initials = getInitials(fallbackName, "DP");
  const image = prefs ? prefs.profileImage : "";
  applyAvatarVisual(preview, image, initials);

  if (clearButton instanceof HTMLButtonElement) {
    clearButton.disabled = !normalizeProfileImageData(image);
  }
}

function stripLegacyCustomizationSections() {
  document.querySelectorAll("[data-customization]").forEach((section) => {
    section.remove();
  });
}

function initPasswordVisibilityToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    if (!(toggle instanceof HTMLInputElement) || toggle.dataset.bound === "1") {
      return;
    }
    toggle.dataset.bound = "1";
    const selector = String(toggle.getAttribute("data-target") || "").trim();
    if (!selector) {
      return;
    }

    const apply = () => {
      const show = toggle.checked;
      selector
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((targetSelector) => {
          const field = document.querySelector(targetSelector);
          if (field instanceof HTMLInputElement) {
            field.type = show ? "text" : "password";
          }
        });
    };

    toggle.addEventListener("change", apply);
    apply();
  });
}

function updateControlCenterScrollLock() {
  const hasOpenModal = Boolean(document.querySelector(".modal.show"));
  const hasOpenMenu = Boolean(document.querySelector("[data-user-menu].open"));
  document.body.classList.toggle("modal-open", hasOpenModal || hasOpenMenu);
}

function closeControlMenu() {
  document.querySelectorAll("[data-user-menu]").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll("[data-user-overlay]").forEach((overlay) => {
    overlay.classList.remove("show");
    overlay.classList.remove("open");
  });
  updateControlCenterScrollLock();
}

function openControlMenu() {
  refreshControlCenter();
  document.querySelectorAll("[data-user-menu]").forEach((menu) => menu.classList.add("open"));
  document.querySelectorAll("[data-user-overlay]").forEach((overlay) => {
    overlay.classList.add("show");
    overlay.classList.add("open");
  });
  updateControlCenterScrollLock();
}

function refreshControlCenter() {
  const session = getSession();
  const isLoggedIn = Boolean(session && session.email);
  const isAdmin = Boolean(session && isOwnerRole(session.role));
  const prefs = isLoggedIn ? getAccountPrefs(session.id) : null;
  const displayName = isLoggedIn ? (prefs.displayName || session.name || session.email) : "";
  const initials = isLoggedIn ? getInitials(displayName, "DP") : "DP";
  const profileImage = isLoggedIn ? normalizeProfileImageData(prefs.profileImage) : "";

  document.body.classList.toggle("admin-mode", isAdmin);
  stripLegacyCustomizationSections();

  document.querySelectorAll("[data-user-menu-trigger]").forEach((trigger) => {
    trigger.classList.toggle("hidden", !isLoggedIn);
  });
  document.querySelectorAll('[data-auth-link="login"], [data-auth-link="signup"]').forEach((link) => {
    link.classList.toggle("hidden", isLoggedIn);
  });

  document.querySelectorAll("[data-profile-avatar], [data-user-avatar]").forEach((el) => {
    applyAvatarVisual(el, profileImage, initials);
  });

  document.querySelectorAll("[data-profile-email]").forEach((el) => {
    el.textContent = isLoggedIn ? displayName : "user@CYBRLY.io";
    el.setAttribute("title", isLoggedIn && session.email ? session.email : "");
  });

  const label = isAdmin ? "Owner" : "User";
  document.querySelectorAll(".profile-label").forEach((el) => {
    el.textContent = isLoggedIn ? label : "Logged in";
  });

  document.querySelectorAll("[data-user-role-label]").forEach((el) => {
    el.textContent = isAdmin ? "Owner Access" : "User Access";
  });
  document.querySelectorAll("[data-user-menu-title]").forEach((el) => {
    el.textContent = isAdmin ? "Owner Control Center" : "User Dashboard";
  });
  document.querySelectorAll("[data-user-menu-sub]").forEach((el) => {
    el.textContent = isAdmin
      ? "Centralized monitoring for users, purchases, uploads, and global activity."
      : "Account controls and profile customization. Control-center logs are owner only.";
  });
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = isLoggedIn ? displayName : "CYBRLY User";
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = isLoggedIn ? session.email : "user@CYBRLY.io";
  });
  document.querySelectorAll("[data-user-bio]").forEach((el) => {
    el.textContent = isLoggedIn
      ? (prefs.bio || (isAdmin ? "System authority. Monitoring global activity." : "Neon system builder."))
      : "Neon system builder.";
  });
  document.querySelectorAll("[data-user-role-badge]").forEach((el) => {
    el.textContent = isAdmin ? "Owner" : "User";
  });
  document.querySelectorAll("[data-user-meta]").forEach((el) => {
    const users = getUsers();
    const currentUser = isLoggedIn
      ? users.find((user) => normalizeEmail(user.email) === normalizeEmail(session.email))
      : null;
    const metaDate = isLoggedIn ? (session.loginAt || currentUser?.createdAt || "") : "";
    el.textContent = metaDate ? `Last login ${new Date(metaDate).toLocaleString()}` : "Member since --";
  });

  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.classList.toggle("show", isAdmin);
    el.classList.toggle("hidden", !isAdmin);
  });

  const userDashboard = document.querySelector("[data-user-dashboard]");
  const adminDashboard = document.querySelector("[data-admin-dashboard]");
  if (userDashboard) {
    userDashboard.style.display = "none";
  }
  if (adminDashboard) {
    adminDashboard.style.display = isAdmin ? "grid" : "none";
  }

  if (isLoggedIn && session.email && isAdmin) {
    const userKey = normalizeEmail(session.email);
    const logs = getControlCenterLogs();
    const record = logs[userKey] || ensureControlLogRecord(userKey);
    const sessionMs = Date.now() - controlCenterSessionStartMs;
    const totalMs = Number(record.totalVisitMs || 0) + sessionMs;

    const visitTime = document.querySelector("[data-user-visit-time]");
    const visits = document.querySelector("[data-user-visits]");
    const purchases = document.querySelector("[data-user-purchases]");
    const purchaseList = document.querySelector("[data-user-purchase-list]");
    const timeline = document.querySelector("[data-user-timeline]");

    if (visitTime) {
      visitTime.textContent = formatControlDuration(totalMs);
    }
    if (visits) {
      visits.textContent = String(Number(record.visits || 0));
    }
    if (purchases) {
      purchases.textContent = String(Array.isArray(record.purchases) ? record.purchases.length : 0);
    }
    if (purchaseList) {
      const userPurchases = Array.isArray(record.purchases) ? record.purchases : [];
      purchaseList.innerHTML = userPurchases.length
        ? userPurchases.slice(0, 8).map((item) => `<div class="menu-log-item"><span>${escapeHtml(item.name || "Purchase")}</span>${escapeHtml(item.time || "--")}</div>`).join("")
        : '<div class="menu-log-item"><span>No purchases yet</span>Start building your template vault.</div>';
      purchaseList.classList.toggle("hidden", prefs.showPurchases === false);
    }
    if (timeline) {
      const events = Array.isArray(record.timeline) ? record.timeline : [];
      timeline.innerHTML = events.length
        ? events.slice(0, 8).map((entry) => `<div class="menu-log-item"><span>${escapeHtml(entry.message || "Activity")}</span>${new Date(entry.time || Date.now()).toLocaleString()}</div>`).join("")
        : '<div class="menu-log-item"><span>No activity yet</span>Events will appear here.</div>';
      timeline.classList.toggle("hidden", prefs.showActivity === false);
    }
  }

  if (isAdmin) {
    const logs = getControlCenterLogs();
    const records = Object.values(logs).filter((entry) => entry && typeof entry === "object");
    const totalVisits = records.reduce((sum, entry) => sum + Number(entry.visits || 0), 0);
    const totalPurchases = records.reduce((sum, entry) => sum + (Array.isArray(entry.purchases) ? entry.purchases.length : 0), 0);
    const totalUploads = getCustomBooks().length;

    const adminVisits = document.querySelector("[data-admin-visits]");
    const adminPurchases = document.querySelector("[data-admin-purchases]");
    const adminUploads = document.querySelector("[data-admin-uploads]");
    const adminLogList = document.querySelector("[data-admin-log-list]");
    if (adminVisits) {
      adminVisits.textContent = String(totalVisits);
    }
    if (adminPurchases) {
      adminPurchases.textContent = String(totalPurchases);
    }
    if (adminUploads) {
      adminUploads.textContent = String(totalUploads);
    }
    if (adminLogList) {
      const combined = [];
      records.forEach((entry) => {
        const events = Array.isArray(entry.timeline) ? entry.timeline : [];
        combined.push(...events);
      });
      combined.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
      adminLogList.innerHTML = combined.length
        ? combined.slice(0, 8).map((entry) => `<div class="menu-log-item"><span>${escapeHtml(entry.message || "Activity")}</span>${new Date(entry.time || Date.now()).toLocaleString()}</div>`).join("")
        : '<div class="menu-log-item"><span>No activity yet</span>System events will appear here.</div>';
    }
  }

  if (isLoggedIn) {
    applyCybrlyControlPrefs(prefs);
  } else {
    document.body.classList.remove(
      "layout-compact",
      "hide-email",
      "hide-activity",
      "hide-purchases",
      "profile-private",
      "reduce-motion"
    );
    document.documentElement.style.fontSize = "";
    document.documentElement.style.setProperty("--radius-xl", "24px");
    document.documentElement.style.setProperty("--radius-lg", "18px");
    document.documentElement.style.setProperty("--radius-md", "12px");
    document.documentElement.style.removeProperty("--control-glow-strength");
    document.documentElement.style.scrollBehavior = "";
    document.body.style.scrollBehavior = "";
    applyUserAccent();
  }
}

function ensureControlCenterCloseButtons() {
  document.querySelectorAll(".user-menu-header").forEach((header) => {
    if (header.querySelector("[data-user-menu-close]")) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-close";
    button.setAttribute("aria-label", "Close control center");
    button.setAttribute("title", "Close");
    button.setAttribute("data-user-menu-close", "1");
    button.innerHTML = "&times;";
    header.appendChild(button);
  });
}

function bindControlCenter() {
  const trigger = document.querySelector("[data-user-menu-trigger]");
  const menu = document.querySelector("[data-user-menu]");
  const overlay = document.querySelector("[data-user-overlay]");
  if (!trigger || !menu || !overlay) {
    return;
  }

  if (trigger.dataset.bound !== "1") {
    trigger.dataset.bound = "1";
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.classList.contains("open")) {
        closeControlMenu();
      } else {
        openControlMenu();
      }
    });
  }

  if (overlay.dataset.bound !== "1") {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", () => {
      closeControlMenu();
    });
  }

  document.querySelectorAll("[data-user-menu-close]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      closeControlMenu();
    });
  });

  if (menu.dataset.bound !== "1") {
    menu.dataset.bound = "1";
    menu.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const actionEl = target.closest("[data-action]");
      const modalEl = target.closest("[data-open-modal]");

      if (actionEl) {
        const action = actionEl.getAttribute("data-action");

        if (action === "logout") {
          const shouldLogout = await openPopupModal({
            title: "Logout",
            message: "Do you want to logout from this account?",
            kind: "warning",
            showCancel: true,
            confirmText: "Logout",
            cancelText: "Stay"
          });
          if (!shouldLogout) {
            return;
          }
          clearSession();
          closeControlMenu();
          refreshControlCenter();
          window.location.href = "login.html";
          return;
        }
      }

      if (modalEl) {
        const modalKey = modalEl.getAttribute("data-open-modal");
        if (modalKey === "profile-customize") {
          showCybrlyModal("profile-customize");
          const session = getSession();
          if (session) {
            const prefs = getAccountPrefs(session.id);
            document.querySelectorAll('[data-modal="profile-customize"] [data-pref-field]').forEach((field) => {
              const key = field.getAttribute("data-pref-field");
              const value = prefs[key];
              if (field instanceof HTMLInputElement && field.type === "checkbox") {
                field.checked = Boolean(value);
              } else if (value !== undefined && value !== null) {
                field.value = String(value);
              }
              updateRangeReadout(field, value);
            });
            syncCustomizeAvatarState(session, prefs);
            initCustomSelects();
          }
        }
      }
    });
  }

  document.querySelectorAll(".modal[data-modal]").forEach((modal) => {
    if (modal.dataset.bound === "1") {
      return;
    }
    modal.dataset.bound = "1";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        hideCybrlyModal(modal);
      }
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    if (btn.dataset.bound === "1") {
      return;
    }
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      hideCybrlyModal(btn.closest(".modal"));
    });
  });

  document.querySelectorAll('[data-modal="profile-customize"] [data-pref-field]').forEach((field) => {
    if (field.dataset.bound === "1") {
      return;
    }
    field.dataset.bound = "1";
    const eventName = (
      (field instanceof HTMLInputElement && field.type === "checkbox")
      || field instanceof HTMLSelectElement
    )
      ? "change"
      : "input";
    field.addEventListener(eventName, () => {
      const session = getSession();
      if (!session) {
        return;
      }
      const key = field.getAttribute("data-pref-field");
      if (!key) {
        return;
      }

      const prefs = getAccountPrefs(session.id);
      let value;
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        value = field.checked;
      } else if (field instanceof HTMLInputElement && (field.type === "range" || field.type === "number")) {
        value = Number(field.value);
      } else {
        value = String(field.value || "").trim();
      }

      const next = { ...prefs, [key]: value };
      if (key === "layoutDensity") {
        next.compact = value === "compact";
      }
      if (key === "compact") {
        next.layoutDensity = value ? "compact" : "comfortable";
      }
      if (key === "displayName" && value) {
        setSession({
          ...session,
          name: value
        });
      }
      if (key === "layoutDensity") {
        addControlTimeline(normalizeEmail(session.email), `Layout switched to ${next.layoutDensity}`);
      }

      setAccountPrefs(session.id, next);
      applyCybrlyControlPrefs(next);
      refreshControlCenter();
      updateRangeReadout(field, value);
      syncCustomizeAvatarState(session, next);

      const status = document.querySelector('[data-modal="profile-customize"] [data-customize-status]');
      if (status) {
        status.textContent = "Saved automatically.";
        status.dataset.state = "success";
      }
    });
  });

  const avatarInput = document.querySelector('[data-modal="profile-customize"] [data-avatar-upload]');
  if (avatarInput instanceof HTMLInputElement && avatarInput.dataset.bound !== "1") {
    avatarInput.dataset.bound = "1";
    avatarInput.addEventListener("change", async () => {
      const session = getSession();
      const status = document.querySelector('[data-modal="profile-customize"] [data-customize-status]');
      if (!session) {
        setStatus(status, "Please login to update profile image.", true);
        return;
      }

      const file = avatarInput.files && avatarInput.files[0];
      if (!file) {
        return;
      }
      if (!validateImageFile(file)) {
        setStatus(status, "Please choose a valid image file.", true);
        avatarInput.value = "";
        return;
      }
      if (file.size > 2_000_000) {
        setStatus(status, "Profile image must be 2MB or smaller.", true);
        avatarInput.value = "";
        return;
      }

      try {
        const imageData = await readFileAsDataUrl(file);
        const prefs = getAccountPrefs(session.id);
        const next = {
          ...prefs,
          profileImage: imageData
        };
        setAccountPrefs(session.id, next);
        applyCybrlyControlPrefs(next);
        refreshControlCenter();
        syncCustomizeAvatarState(session, next);
        setStatus(status, "Profile image updated.", false);
      } catch (error) {
        setStatus(status, "Could not process selected image.", true);
      } finally {
        avatarInput.value = "";
      }
    });
  }

  const clearAvatarButton = document.querySelector('[data-modal="profile-customize"] [data-avatar-clear]');
  if (clearAvatarButton instanceof HTMLButtonElement && clearAvatarButton.dataset.bound !== "1") {
    clearAvatarButton.dataset.bound = "1";
    clearAvatarButton.addEventListener("click", () => {
      const session = getSession();
      const status = document.querySelector('[data-modal="profile-customize"] [data-customize-status]');
      if (!session) {
        setStatus(status, "Please login to update profile image.", true);
        return;
      }
      const prefs = getAccountPrefs(session.id);
      const next = {
        ...prefs,
        profileImage: ""
      };
      setAccountPrefs(session.id, next);
      applyCybrlyControlPrefs(next);
      refreshControlCenter();
      syncCustomizeAvatarState(session, next);
      setStatus(status, "Profile image removed.", false);
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (!menu.contains(target) && !trigger.contains(target)) {
      closeControlMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeControlMenu();
      document.querySelectorAll(".modal.show").forEach((modal) => hideCybrlyModal(modal));
    }
  });
}

function createCoverMarkup(book) {
  const safeCover = String(book.coverPreview || "");
  const encoded = encodeURIComponent(safeCover);
  const safeTitle = escapeHtml(book.title);
  return `<div class="cover" data-cover="${encoded}" aria-label="${safeTitle} cover"></div>`;
}

function cardTemplate(book, options = {}) {
  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author);
  const safeLang = escapeHtml(book.lang);
  const safeCategory = escapeHtml(book.category);
  const safeDesc = escapeHtml(book.desc || "No description provided.");
  const encodedId = encodeURIComponent(book.id);
  const ratingLabel = escapeHtml(formatBookRatingSummary(book.id));
  const storageMode = book.storageMode === "cloud" ? "Cloud" : "Local";
  const rokomariUrl = normalizeRokomariUrl(book.rokomariUrl || "");
  const safeRokomariUrl = escapeHtml(rokomariUrl);
  const hasQr = Boolean(String(book.qrImageUrl || book.qrImageData || "").trim());
  const rokomariLink = safeRokomariUrl
    ? `<a class="meta-pill meta-link" href="${safeRokomariUrl}" target="_blank" rel="noopener">Rokomari Link</a>`
    : "";
  const qrMeta = `<span class="meta-pill">QR: ${hasQr ? "Yes" : "No"}</span>`;

  const toggleFeatured = options.showFeaturedToggle
    ? `<button class="btn btn-ghost small" type="button" data-toggle-featured="${encodedId}">${book.featured ? "Unmark Featured" : "Mark Featured"}</button>`
    : "";

  const removeAction = options.showDelete
    ? `<button class="btn btn-danger-action small" type="button" data-delete-book="${encodedId}">Delete</button>`
    : "";

  return `
    <article class="ebook-card" data-book-id="${encodedId}">
      ${createCoverMarkup(book)}
      ${book.coverPdfName ? `<span class="cover-badge">Cover PDF</span>` : ""}
      <span class="tag-pill">${safeCategory}</span>
      <h3 class="book-title">${safeTitle}</h3>
      <p class="book-meta">${safeAuthor} · ${safeLang}</p>
      <p class="book-rating">${ratingLabel}</p>
      <p class="book-text">${safeDesc}</p>
      <div class="book-row">
        <strong class="book-price">${formatPrice(book.price)}</strong>
        ${book.featured ? `<span class="tag-pill">Featured</span>` : ""}
      </div>
      <div class="actions">
        ${toggleFeatured}
        ${removeAction}
        <a class="btn btn-ghost small" href="book.html?id=${encodedId}">View</a>
      </div>
      ${options.showFileMeta ? `<div class="inline-meta"><span class="meta-pill">Storage: ${storageMode}</span><span class="meta-pill">Cover: ${escapeHtml(book.coverPdfName || "N/A")}</span>${rokomariLink}${qrMeta}</div>` : ""}
    </article>
  `;
}

function hydrateCovers(scope) {
  const root = scope || document;
  root.querySelectorAll("[data-cover]").forEach((element) => {
    const encoded = element.getAttribute("data-cover") || "";
    let decoded = "";

    try {
      decoded = decodeURIComponent(encoded);
    } catch (error) {
      decoded = encoded;
    }

    const safeUrl = decoded
      .replaceAll("\"", "%22")
      .replaceAll("'", "%27")
      .replace(/(\r\n|\n|\r)/gm, "");

    element.style.backgroundImage = `url("${safeUrl}")`;
  });
}

function getBookCreatedTime(book) {
  return new Date(book && book.createdAt ? book.createdAt : 0).getTime();
}

function getFilteredBooks(filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const category = String(filters.category || "all");
  const lang = String(filters.lang || "all");
  const featured = String(filters.featured || "all");
  const sortBy = String(filters.sortBy || "newest");

  let list = getAllBooks().filter((book) => {
    if (category !== "all" && String(book.category || "") !== category) {
      return false;
    }
    if (lang !== "all" && String(book.lang || "") !== lang) {
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

    const searchable = [
      book.title,
      book.author,
      book.desc,
      book.category,
      book.lang
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return searchable.includes(query);
  });

  const sorters = {
    newest: (left, right) => getBookCreatedTime(right) - getBookCreatedTime(left),
    title_az: (left, right) => String(left.title || "").localeCompare(String(right.title || "")),
    price_low: (left, right) => Number(left.price || 0) - Number(right.price || 0),
    price_high: (left, right) => Number(right.price || 0) - Number(left.price || 0),
    rating_high: (left, right) => {
      const rightRating = getBookRatingSummary(right.id).average;
      const leftRating = getBookRatingSummary(left.id).average;
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }
      return getBookCreatedTime(right) - getBookCreatedTime(left);
    }
  };

  const sorter = sorters[sortBy] || sorters.newest;
  list = list.slice().sort(sorter);
  return list;
}

function initBookSearchFilters() {
  const form = document.getElementById("books-discovery-form");
  const resultRoot = document.getElementById("books-discovery-results");
  const summary = document.getElementById("books-discovery-summary");
  if (!(form instanceof HTMLFormElement) || !resultRoot || !summary) {
    return;
  }

  const render = () => {
    const formData = new FormData(form);
    const books = getFilteredBooks({
      query: String(formData.get("query") || ""),
      category: String(formData.get("category") || "all"),
      lang: String(formData.get("lang") || "all"),
      featured: String(formData.get("featured") || "all"),
      sortBy: String(formData.get("sortBy") || "newest")
    });

    const totalBooks = getAllBooks().length;
    if (!totalBooks) {
      summary.textContent = "No books available yet.";
      resultRoot.innerHTML = "<article class='ebook-card placeholder-cell'><p>Upload books from owner panel to start discovery.</p></article>";
      return;
    }

    summary.textContent = `Found ${books.length} of ${totalBooks} books.`;
    resultRoot.innerHTML = books.length
      ? books.map((book) => cardTemplate(book)).join("")
      : "<article class='ebook-card placeholder-cell'><p>No books match your search and filters.</p></article>";
    hydrateCovers(resultRoot);
  };

  if (form.dataset.bound !== "1") {
    form.dataset.bound = "1";
    form.addEventListener("input", render);
    form.addEventListener("change", render);

    const resetButton = form.querySelector("[data-books-filter-reset]");
    if (resetButton instanceof HTMLButtonElement) {
      resetButton.addEventListener("click", () => {
        form.reset();
        form.querySelectorAll("select.select").forEach((select) => {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        render();
      });
    }
  }

  render();
}

function findUserReview(bookId, session) {
  if (!bookId || !session) {
    return null;
  }

  const email = normalizeEmail(session.email);
  return getBookReviews(bookId).find((review) => {
    if (!review || typeof review !== "object") {
      return false;
    }
    if (session.id && String(review.userId || "") === String(session.id)) {
      return true;
    }
    return normalizeEmail(review.email || "") === email;
  }) || null;
}

function buildReviewListMarkup(bookId) {
  const reviews = getBookReviews(bookId);
  if (!reviews.length) {
    return "<article class='review-card'><p class='info-text'>No reviews yet. Be the first reader to rate this book.</p></article>";
  }

  return reviews.map((review) => {
    const safeName = escapeHtml(review.name || "Reader");
    const safeComment = escapeHtml(review.comment || "No written comment.");
    const timeLabel = new Date(review.updatedAt || review.createdAt || Date.now()).toLocaleString();
    return `
      <article class="review-card">
        <div class="review-head">
          <strong>${safeName}</strong>
          <span class="review-rating-pill">${Number(review.rating || 0)}/5</span>
        </div>
        <p class="info-text">${safeComment}</p>
        <p class="review-time">${timeLabel}</p>
      </article>
    `;
  }).join("");
}

function refreshBookReviewSection(bookId) {
  const summary = document.querySelector("[data-book-review-summary]");
  const list = document.querySelector("[data-book-review-list]");
  if (!summary || !list) {
    return;
  }

  summary.textContent = `Community Rating: ${formatBookRatingSummary(bookId)}`;
  list.innerHTML = buildReviewListMarkup(bookId);
}

function bindBookReviewForm(book) {
  const form = document.getElementById("book-review-form");
  if (!(form instanceof HTMLFormElement) || !book) {
    return;
  }

  const status = form.querySelector("[data-review-status]");
  const ratingInput = form.querySelector('[name="rating"]');
  const commentInput = form.querySelector('[name="comment"]');
  const session = getSession();
  const existing = findUserReview(book.id, session);

  if (ratingInput instanceof HTMLSelectElement && existing) {
    ratingInput.value = String(existing.rating);
  }
  if (commentInput instanceof HTMLTextAreaElement && existing) {
    commentInput.value = String(existing.comment || "");
  }

  initCustomSelects();

  if (form.dataset.bound === "1") {
    return;
  }
  form.dataset.bound = "1";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const activeSession = getSession();
    if (!activeSession) {
      setStatus(status, "Please login to submit a rating and review.", true);
      return;
    }

    const formData = new FormData(form);
    const rating = Number(formData.get("rating") || 0);
    const comment = String(formData.get("comment") || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setStatus(status, "Please select a rating between 1 and 5.", true);
      return;
    }

    if (!upsertBookReview(book.id, activeSession, rating, comment)) {
      setStatus(status, "Could not save your review. Try again.", true);
      return;
    }

    addControlTimeline(normalizeEmail(activeSession.email), `Reviewed book ${book.title}`);
    setStatus(status, "Your review has been saved.", false);
    refreshBookReviewSection(book.id);
    renderHomeCategories();
    renderBooksPageCategories();
    renderCategoryPage();
  });
}
function renderHomeCategories() {
  const root = document.getElementById("home-category-sections");
  if (!root) {
    return;
  }

  const blocks = CATEGORIES.map((category) => {
    const featuredBooks = getFeaturedByCategory(category, 3);
    const bookCards = featuredBooks
      .map((book) => cardTemplate(book))
      .join("");

    const placeholdersNeeded = Math.max(0, 3 - featuredBooks.length);
    const placeholders = Array.from({ length: placeholdersNeeded })
      .map(() => `<article class="ebook-card placeholder-cell"><p>Featured slot available</p></article>`)
      .join("");

    return `
      <section class="category-block">
        <h3 class="category-title">${escapeHtml(category)}</h3>
        <div class="cards-grid">
          ${bookCards}
          ${placeholders}
        </div>
      </section>
    `;
  }).join("");

  root.innerHTML = blocks;
  hydrateCovers(root);
}

function createShowAllCell(category) {
  const slug = CATEGORY_SLUGS[category];
  return `
    <article class="show-all-cell">
      <span class="section-label">Category Action</span>
      <h4>Show All</h4>
      <p class="info-text">View complete ${escapeHtml(category)} collection.</p>
      <a class="btn btn-primary" href="category.html?category=${encodeURIComponent(slug)}">Open Category</a>
    </article>
  `;
}

function renderBooksPageCategories() {
  const root = document.getElementById("books-category-sections");
  if (!root) {
    return;
  }

  const sections = CATEGORIES.map((category) => {
    const featuredBooks = getFeaturedByCategory(category, 3);

    const bookCells = Array.from({ length: 3 }).map((_, index) => {
      const book = featuredBooks[index];
      if (!book) {
        return `<article class="ebook-card placeholder-cell"><p>No featured book in slot ${index + 1}</p></article>`;
      }
      return cardTemplate(book);
    }).join("");

    return `
      <section class="category-block">
        <h3 class="category-title">${escapeHtml(category)}</h3>
        <div class="cards-grid four">
          ${bookCells}
          ${createShowAllCell(category)}
        </div>
      </section>
    `;
  }).join("");

  root.innerHTML = sections;
  hydrateCovers(root);
}

function renderCategoryPage() {
  const titleEl = document.getElementById("category-page-title");
  const root = document.getElementById("category-books-grid");
  if (!titleEl || !root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("category");
  const category = findCategoryBySlug(slug) || CATEGORIES[0];
  const books = getBooksByCategory(category);

  titleEl.textContent = `${category} Books`;

  if (!books.length) {
    root.innerHTML = "<article class='ebook-card placeholder-cell'><p>No books in this category yet.</p></article>";
    return;
  }

  root.innerHTML = books.map((book) => cardTemplate(book)).join("");
  hydrateCovers(root);
}

function renderBookDetail() {
  const root = document.getElementById("book-detail-root");
  if (!root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");
  const book = findBookById(bookId) || getAllBooks()[0];

  if (!book) {
    root.innerHTML = "<article class='soft-panel'><p class='info-text'>No books available.</p></article>";
    return;
  }

  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author);
  const safeCategory = escapeHtml(book.category);
  const safeLang = escapeHtml(book.lang);
  const safeDesc = escapeHtml(book.desc || "No description provided.");
  const ratingSummaryText = escapeHtml(formatBookRatingSummary(book.id));
  const session = getSession();
  const userReview = findUserReview(book.id, session);
  const rokomariUrl = normalizeRokomariUrl(book.rokomariUrl || "");
  const safeRokomariUrl = escapeHtml(rokomariUrl);
  const qrSource = String(book.qrImageUrl || book.qrImageData || "").trim();
  const safeQrSource = qrSource
    .replaceAll("\"", "%22")
    .replaceAll("'", "%27")
    .replace(/(\r\n|\n|\r)/gm, "");

  root.innerHTML = `
    <div class="book-detail-layout">
      <article class="soft-panel book-detail-main">
        <div class="cover book-detail-cover" data-cover="${encodeURIComponent(book.coverPreview)}"></div>
        <div>
          <span class="section-label">${safeCategory}</span>
          <h2 style="margin:0.55rem 0 0.46rem;">${safeTitle}</h2>
          <p class="book-meta">By ${safeAuthor} · ${safeLang}</p>
          <p class="book-rating">Community rating: ${ratingSummaryText}</p>
          <p class="book-text">${safeDesc}</p>
          <p class="book-price" style="margin:0.45rem 0;">Price: ${formatPrice(book.price)}</p>
          <div class="inline-meta">
            ${book.featured ? '<span class="meta-pill">Featured</span>' : ""}
            ${safeRokomariUrl ? '<span class="meta-pill">Rokomari Link</span>' : ""}
            ${safeQrSource ? '<span class="meta-pill">QR Available</span>' : ""}
          </div>
          <div class="actions" style="margin-top:0.65rem;">
            <a class="btn btn-ghost small" href="books.html">Back to Books</a>
          </div>
        </div>
      </article>

      <aside class="soft-panel detail-side">
        <h3>How to Buy This Ebook</h3>
        <ol class="purchase-steps">
          <li>Use the Rokomari link or QR code below.</li>
          <li>Complete purchase flow from the provided source.</li>
          <li>Need support? Contact e-Zone with the title and your email.</li>
        </ol>
        ${safeRokomariUrl ? `<div class="actions" style="margin-top:0.7rem;"><a class="btn btn-primary" href="${safeRokomariUrl}" target="_blank" rel="noopener">Open on Rokomari</a></div>` : ""}
        ${safeQrSource ? `
          <div class="qr-box">
            <p class="info-text">Scan QR to open purchase source</p>
            <img class="qr-image" src="${safeQrSource}" alt="QR code for ${safeTitle}">
          </div>
        ` : ""}
        ${!safeRokomariUrl && !safeQrSource ? `<p class="info-text" style="margin-top:0.7rem;">Owner has not added a purchase source yet.</p>` : ""}
        <p style="margin-top:0.65rem;"><a href="mailto:abirxxdbrine2024@gmail.com">abirxxdbrine2024@gmail.com</a></p>
      </aside>
    </div>

    <section class="soft-panel review-panel">
      <div class="section-header">
        <div>
          <span class="section-label">Ratings and Reviews</span>
          <h3>Reader Feedback</h3>
          <p class="info-text" data-book-review-summary>Community Rating: ${ratingSummaryText}</p>
        </div>
      </div>
      ${session ? `
        <form id="book-review-form" class="review-form" novalidate>
          <div class="field">
            <label for="review-rating">Your Rating *</label>
            <select class="select" id="review-rating" name="rating" required>
              <option value="">Select rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very good</option>
              <option value="3">3 - Good</option>
              <option value="2">2 - Fair</option>
              <option value="1">1 - Poor</option>
            </select>
          </div>
          <div class="field">
            <label for="review-comment">Comment (optional)</label>
            <textarea class="textarea" id="review-comment" name="comment" rows="3" maxlength="700" placeholder="Share your reading experience...">${escapeHtml(userReview ? userReview.comment || "" : "")}</textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">${userReview ? "Update Review" : "Submit Review"}</button>
          </div>
          <p class="status" data-review-status aria-live="polite"></p>
        </form>
      ` : `
        <div class="notice">
          Login is required to submit ratings and reviews.
          <a href="login.html">Open login</a>
        </div>
      `}
      <div class="review-list" data-book-review-list>
        ${buildReviewListMarkup(book.id)}
      </div>
    </section>
  `;

  hydrateCovers(root);
  bindBookReviewForm(book);
  refreshBookReviewSection(book.id);

  const relatedRoot = document.getElementById("related-books");
  if (relatedRoot) {
    const related = getBooksByCategory(book.category).filter((entry) => entry.id !== book.id).slice(0, 4);
    relatedRoot.innerHTML = related.length
      ? related.map((entry) => cardTemplate(entry)).join("")
      : "<article class='ebook-card placeholder-cell'><p>No related books found.</p></article>";
    hydrateCovers(relatedRoot);
  }
}
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) {
    return;
  }

  const status = document.getElementById("contact-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(formData.get("email"));
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus(status, "Please complete all fields.", true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(status, "Please enter a valid email address.", true);
      return;
    }

    form.reset();
    setStatus(status, "Message captured in demo mode. Email sending is not connected yet.", false);
  });
}

function isStrongPassword(password) {
  return String(password || "").length >= 8;
}

async function initSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) {
    return;
  }

  const status = document.getElementById("signup-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!name || !email || !password || !confirmPassword) {
      setStatus(status, "Please complete all signup fields.", true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(status, "Please enter a valid email address.", true);
      return;
    }

    if (email === normalizeEmail(ADMIN_ACCOUNT.email)) {
      setStatus(status, "Owner credentials are fixed and cannot be created from registration.", true);
      return;
    }

    if (!isStrongPassword(password)) {
      setStatus(status, "Password must be at least 8 characters.", true);
      return;
    }

    if (password !== confirmPassword) {
      setStatus(status, "Password and confirm password do not match.", true);
      return;
    }

    const users = getUsers();
    const exists = users.some((user) => normalizeEmail(user.email) === email);

    if (exists) {
      setStatus(status, "This email already exists. Please login.", true);
      return;
    }

    const passHash = await hashPassword(password);

    const user = {
      id: createId("user"),
      name,
      email,
      passHash,
      role: "user",
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      loginAt: new Date().toISOString()
    });

    refreshControlCenter();
    setStatus(status, "Registration complete. Redirecting to home...", false);

    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 850);
  });
}

async function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) {
    return;
  }

  const status = document.getElementById("login-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setStatus(status, "Please provide email and password.", true);
      return;
    }

    const users = getUsers();
    const user = users.find((entry) => normalizeEmail(entry.email) === email);

    if (!user) {
      setStatus(status, "No account found for this email.", true);
      return;
    }

    const passHash = await hashPassword(password);
    if (passHash !== user.passHash) {
      setStatus(status, "Incorrect password.", true);
      return;
    }

    setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      loginAt: new Date().toISOString()
    });

    refreshControlCenter();
    setStatus(status, "Login successful. Redirecting...", false);

    window.setTimeout(() => {
      window.location.href = isOwnerRole(user.role) ? "dashboard.html" : "index.html";
    }, 650);
  });
}

function renderAdminUploadedBooks() {
  const root = document.getElementById("admin-upload-list");
  if (!root) {
    return;
  }

  const books = getCustomBooks();
  if (!books.length) {
    root.innerHTML = "<article class='ebook-card placeholder-cell'><p>No uploaded books yet.</p></article>";
    return;
  }

  root.innerHTML = books
    .map((book) => cardTemplate(book, { showFeaturedToggle: true, showDelete: true, showFileMeta: true }))
    .join("");

  hydrateCovers(root);
}

function getControlCenterSummary() {
  const logs = getControlCenterLogs();
  const entries = Object.entries(logs).filter((entry) => entry[1] && typeof entry[1] === "object");

  const users = entries.map(([email, record]) => {
    const purchases = Array.isArray(record.purchases) ? record.purchases : [];
    const timeline = Array.isArray(record.timeline) ? record.timeline : [];
    const totalVisitMs = Number(record.totalVisitMs || 0);
    const visits = Number(record.visits || 0);
    const lastVisit = record.lastVisitAt || "";

    const events = [
      ...timeline
        .filter((event) => event && typeof event === "object")
        .map((event) => ({
          email,
          message: String(event.message || "Activity"),
          time: event.time || "",
          type: "activity"
        })),
      ...purchases
        .filter((purchase) => purchase && typeof purchase === "object")
        .map((purchase) => ({
          email,
          message: `Purchase: ${purchase.name || "Book"}`,
          time: purchase.time || "",
          type: "purchase"
        }))
    ];

    return {
      email,
      visits,
      totalVisitMs,
      purchases,
      timeline,
      events,
      lastVisit
    };
  });

  const totalUsers = users.length;
  const totalVisits = users.reduce((sum, user) => sum + user.visits, 0);
  const totalPurchases = users.reduce((sum, user) => sum + user.purchases.length, 0);
  const totalVisitMs = users.reduce((sum, user) => sum + user.totalVisitMs, 0);
  const totalUploads = getCustomBooks().length;
  const totalBooks = getAllBooks().length;
  const totalFeatured = getAllBooks().filter((book) => Boolean(book.featured)).length;

  const globalEvents = users
    .flatMap((user) => user.events)
    .sort((left, right) => new Date(right.time || 0).getTime() - new Date(left.time || 0).getTime());

  return {
    users,
    globalEvents,
    totals: {
      totalUsers,
      totalVisits,
      totalPurchases,
      totalVisitMs,
      totalUploads,
      totalBooks,
      totalFeatured
    }
  };
}

function initDashboardPage() {
  const panel = document.getElementById("dashboard-panel");
  if (!panel) {
    return;
  }

  const guard = document.getElementById("dashboard-guard");
  const session = getSession();
  const isAdmin = Boolean(session && isOwnerRole(session.role));

  if (!isAdmin) {
    panel.classList.add("hidden");
    guard?.classList.remove("hidden");
    return;
  }

  panel.classList.remove("hidden");
  guard?.classList.add("hidden");

  const summary = getControlCenterSummary();
  const totals = summary.totals;

  const statMap = {
    "dash-total-users": String(totals.totalUsers),
    "dash-total-books": String(totals.totalBooks),
    "dash-total-featured": String(totals.totalFeatured),
    "dash-total-visits": String(totals.totalVisits),
    "dash-total-purchases": String(totals.totalPurchases),
    "dash-total-time": formatControlDuration(totals.totalVisitMs),
    "dash-total-uploads": String(totals.totalUploads)
  };

  Object.entries(statMap).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  const userSnapshot = document.getElementById("dash-user-snapshot");
  if (userSnapshot) {
    const sortedUsers = [...summary.users].sort((left, right) => right.visits - left.visits);
    userSnapshot.innerHTML = sortedUsers.length
      ? sortedUsers.slice(0, 8).map((user) => `
          <div class="menu-log-item">
            <span>${escapeHtml(user.email)}</span>
            Visits: ${user.visits} · Purchases: ${user.purchases.length} · Time: ${formatControlDuration(user.totalVisitMs)}
          </div>
        `).join("")
      : '<div class="menu-log-item"><span>No user logs yet</span>Activity will appear here.</div>';
  }

  const globalActivity = document.getElementById("dash-global-activity");
  if (globalActivity) {
    globalActivity.innerHTML = summary.globalEvents.length
      ? summary.globalEvents.slice(0, 14).map((event) => `
          <div class="menu-log-item">
            <span>${escapeHtml(event.email)} · ${escapeHtml(event.message)}</span>
            ${new Date(event.time || Date.now()).toLocaleString()}
          </div>
        `).join("")
      : '<div class="menu-log-item"><span>No events yet</span>Global activity will appear here.</div>';
  }

  const recentUploads = document.getElementById("dash-recent-uploads");
  if (recentUploads) {
    const uploads = getCustomBooks()
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

    recentUploads.innerHTML = uploads.length
      ? uploads.slice(0, 10).map((book) => `
          <div class="menu-log-item">
            <span>${escapeHtml(book.title)} · ${escapeHtml(book.author)}</span>
            ${new Date(book.createdAt || Date.now()).toLocaleString()} · ${escapeHtml(book.category || "Category")}
          </div>
        `).join("")
      : '<div class="menu-log-item"><span>No uploads yet</span>Uploaded books will appear here.</div>';
  }
}

function initLogsPage() {
  const panel = document.getElementById("logs-panel");
  if (!panel) {
    return;
  }

  const guard = document.getElementById("logs-guard");
  const session = getSession();
  const isAdmin = Boolean(session && isOwnerRole(session.role));

  if (!isAdmin) {
    panel.classList.add("hidden");
    guard?.classList.remove("hidden");
    return;
  }

  panel.classList.remove("hidden");
  guard?.classList.add("hidden");

  const summary = getControlCenterSummary();
  const totals = summary.totals;

  const totalUsers = document.getElementById("logs-total-users");
  const totalEvents = document.getElementById("logs-total-events");
  const totalVisits = document.getElementById("logs-total-visits");
  const totalPurchases = document.getElementById("logs-total-purchases");

  if (totalUsers) {
    totalUsers.textContent = String(totals.totalUsers);
  }
  if (totalEvents) {
    totalEvents.textContent = String(summary.globalEvents.length);
  }
  if (totalVisits) {
    totalVisits.textContent = String(totals.totalVisits);
  }
  if (totalPurchases) {
    totalPurchases.textContent = String(totals.totalPurchases);
  }

  const usersRoot = document.getElementById("logs-user-grid");
  if (usersRoot) {
    const sortedUsers = [...summary.users].sort((left, right) => {
      const leftTime = new Date(left.lastVisit || 0).getTime();
      const rightTime = new Date(right.lastVisit || 0).getTime();
      return rightTime - leftTime;
    });

    usersRoot.innerHTML = sortedUsers.length
      ? sortedUsers.map((user) => `
          <article class="soft-panel">
            <h3 style="margin-top:0;">${escapeHtml(user.email)}</h3>
            <p class="info-text">Visits: ${user.visits} · Purchases: ${user.purchases.length} · Total Time: ${formatControlDuration(user.totalVisitMs)}</p>
            <div class="menu-log">
              ${user.events.length
                ? user.events.map((event) => `
                    <div class="menu-log-item">
                      <span>${escapeHtml(event.message)}</span>
                      ${new Date(event.time || Date.now()).toLocaleString()}
                    </div>
                  `).join("")
                : '<div class="menu-log-item"><span>No logs for this user</span>Waiting for activity.</div>'}
            </div>
          </article>
        `).join("")
      : '<article class="soft-panel"><p class="info-text">No logs captured yet.</p></article>';
  }

  const globalRoot = document.getElementById("logs-global-list");
  if (globalRoot) {
    globalRoot.innerHTML = summary.globalEvents.length
      ? summary.globalEvents.map((event) => `
          <div class="menu-log-item">
            <span>${escapeHtml(event.email)} · ${escapeHtml(event.message)}</span>
            ${new Date(event.time || Date.now()).toLocaleString()}
          </div>
        `).join("")
      : '<div class="menu-log-item"><span>No global events yet</span>System-wide logs will appear here.</div>';
  }
}

function initCloudConfigForm() {
  const form = document.getElementById("cloud-config-form");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const status = document.getElementById("cloud-config-status");
  const enabledInput = form.querySelector('[name="enabled"]');
  const cloudNameInput = form.querySelector('[name="cloudName"]');
  const uploadPresetInput = form.querySelector('[name="uploadPreset"]');
  const folderInput = form.querySelector('[name="folder"]');

  const applyValues = () => {
    const config = getCloudConfig();
    if (enabledInput instanceof HTMLInputElement) {
      enabledInput.checked = Boolean(config.enabled);
    }
    if (cloudNameInput instanceof HTMLInputElement) {
      cloudNameInput.value = String(config.cloudName || "");
    }
    if (uploadPresetInput instanceof HTMLInputElement) {
      uploadPresetInput.value = String(config.uploadPreset || "");
    }
    if (folderInput instanceof HTMLInputElement) {
      folderInput.value = String(config.folder || "e-zone");
    }
  };

  applyValues();

  if (form.dataset.bound === "1") {
    return;
  }
  form.dataset.bound = "1";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const enabled = Boolean(formData.get("enabled"));
    const cloudName = String(formData.get("cloudName") || "").trim();
    const uploadPreset = String(formData.get("uploadPreset") || "").trim();
    const folder = String(formData.get("folder") || "e-zone").trim();

    if (enabled && (!cloudName || !uploadPreset)) {
      setStatus(status, "Cloud name and upload preset are required when cloud mode is enabled.", true);
      return;
    }

    saveCloudConfig({
      provider: "cloudinary",
      enabled,
      cloudName,
      uploadPreset,
      folder: folder || "e-zone"
    });

    setStatus(status, enabled ? "Cloudinary upload is enabled." : "Cloud upload is disabled. Local mode is active.", false);
  });
}

function initAdminPage() {
  const panel = document.getElementById("admin-panel");
  if (!panel) {
    return;
  }

  const guard = document.getElementById("admin-guard");
  const session = getSession();
  const isAdmin = Boolean(session && isOwnerRole(session.role));
  const adminKey = session && session.email ? normalizeEmail(session.email) : "";

  const logAdminEvent = (message) => {
    if (!adminKey) {
      return;
    }
    addControlTimeline(adminKey, message);
  };

  if (!isAdmin) {
    panel.classList.add("hidden");
    if (guard) {
      guard.classList.remove("hidden");
    }
    return;
  }

  panel.classList.remove("hidden");
  if (guard) {
    guard.classList.add("hidden");
  }

  initCloudConfigForm();

  const form = document.getElementById("admin-book-form");
  const status = document.getElementById("admin-status");
  const uploadList = document.getElementById("admin-upload-list");

  renderAdminUploadedBooks();

  if (uploadList && uploadList.dataset.bound !== "1") {
    uploadList.dataset.bound = "1";

    uploadList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const deleteBtn = target.closest("[data-delete-book]");
      if (deleteBtn) {
        const confirmed = await openPopupModal({
          title: "Delete uploaded book?",
          message: "This removes the book and all related reviews permanently.",
          kind: "danger",
          showCancel: true,
          confirmText: "Delete",
          cancelText: "Cancel"
        });
        if (!confirmed) {
          return;
        }
        const id = decodeURIComponent(deleteBtn.getAttribute("data-delete-book") || "");
        const books = getCustomBooks();
        const deletedBook = books.find((book) => book.id === id);
        const next = books.filter((book) => book.id !== id);
        saveCustomBooks(next);
        removeBookReviews(id);
        renderAdminUploadedBooks();
        renderHomeCategories();
        renderBooksPageCategories();
        renderCategoryPage();
        if (deletedBook) {
          logAdminEvent(`Deleted book ${deletedBook.title}`);
        }
        setStatus(status, "Book removed.", false);
        return;
      }

      const toggleBtn = target.closest("[data-toggle-featured]");
      if (toggleBtn) {
        const id = decodeURIComponent(toggleBtn.getAttribute("data-toggle-featured") || "");
        const next = getCustomBooks().map((book) => {
          if (book.id !== id) {
            return book;
          }
          return {
            ...book,
            featured: !book.featured
          };
        });

        saveCustomBooks(next);
        renderAdminUploadedBooks();
        renderHomeCategories();
        renderBooksPageCategories();
        renderCategoryPage();
        const updatedBook = next.find((book) => book.id === id);
        if (updatedBook) {
          logAdminEvent(`${updatedBook.featured ? "Marked featured" : "Unmarked featured"}: ${updatedBook.title}`);
        }
        setStatus(status, "Featured status updated.", false);
      }
    });
  }

  if (!form || form.dataset.bound === "1") {
    return;
  }

  form.dataset.bound = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const author = String(formData.get("author") || "").trim();
    const lang = String(formData.get("lang") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const price = Number(formData.get("price") || 0);
    const desc = String(formData.get("desc") || "").trim();
    const featured = Boolean(formData.get("featured"));
    const coverPdfFile = formData.get("coverPdf");
    const rawBookLink = String(formData.get("bookLink") || "").trim();
    const rokomariUrl = normalizeRokomariUrl(rawBookLink);
    const qrImageFile = formData.get("qrImage");
    const hasQrUpload = qrImageFile instanceof File && qrImageFile.size > 0;

    if (!title || !author || !lang || !category || !price) {
      setStatus(status, "All fields are required except description.", true);
      return;
    }

    if (!CATEGORIES.includes(category)) {
      setStatus(status, "Please choose a valid category.", true);
      return;
    }

    if (!(coverPdfFile instanceof File) || !validatePdfFile(coverPdfFile)) {
      setStatus(status, "Cover file must be a PDF.", true);
      return;
    }

    if (!rokomariUrl && !hasQrUpload) {
      setStatus(status, "Provide at least one purchase source: Rokomari link or QR code image.", true);
      return;
    }

    if (rawBookLink && !isValidRokomariUrl(rawBookLink)) {
      setStatus(status, "Book link must be a valid rokomari.com URL.", true);
      return;
    }

    if (hasQrUpload && !validateImageFile(qrImageFile)) {
      setStatus(status, "QR code must be a valid image file.", true);
      return;
    }

    const cloudConfig = getCloudConfig();
    const useCloud = isCloudUploadReady(cloudConfig);

    if (cloudConfig.enabled && !useCloud) {
      setStatus(status, "Cloud upload is enabled but incomplete. Save valid cloud config first.", true);
      return;
    }

    const maxCoverSize = useCloud ? 12_000_000 : 1_600_000;
    const maxQrSize = useCloud ? 8_000_000 : 2_000_000;
    if (coverPdfFile.size > maxCoverSize || (hasQrUpload && qrImageFile.size > maxQrSize)) {
      setStatus(
        status,
        useCloud
          ? "Files exceed cloud demo size limits (12MB cover PDF, 8MB QR image)."
          : "Files are too large for local demo storage. Use smaller files.",
        true
      );
      return;
    }

    let coverPdfData = "";
    let coverPdfUrl = "";
    let qrImageData = "";
    let qrImageUrl = "";
    let qrImageName = "";
    const storageMode = useCloud ? "cloud" : "local";

    if (useCloud) {
      try {
        const uploads = [uploadPdfToCloudinary(coverPdfFile, cloudConfig, "cover")];
        if (hasQrUpload) {
          uploads.push(uploadImageToCloudinary(qrImageFile, cloudConfig, "qr"));
        }
        const results = await Promise.all(uploads);
        const coverUpload = results[0];
        coverPdfUrl = coverUpload.url;
        if (hasQrUpload && results[1]) {
          qrImageUrl = results[1].url;
          qrImageName = qrImageFile.name;
        }
      } catch (error) {
        setStatus(status, `Cloud upload failed: ${error instanceof Error ? error.message : "Unknown error"}`, true);
        return;
      }
    } else {
      try {
        const reads = [readFileAsDataUrl(coverPdfFile)];
        if (hasQrUpload) {
          reads.push(readFileAsDataUrl(qrImageFile));
        }
        const results = await Promise.all(reads);
        coverPdfData = String(results[0] || "");
        if (hasQrUpload && results[1]) {
          qrImageData = String(results[1] || "");
          qrImageName = qrImageFile.name;
        }
      } catch (error) {
        setStatus(status, "Unable to process upload files.", true);
        return;
      }
    }

    const customBooks = getCustomBooks();

    customBooks.unshift({
      id: createId("book"),
      title,
      author,
      lang,
      category,
      price,
      desc,
      featured,
      coverPreview: buildCoverImage(title, category),
      coverPdfName: coverPdfFile.name,
      coverPdfData,
      coverPdfUrl,
      rokomariUrl,
      qrImageName,
      qrImageData,
      qrImageUrl,
      storageMode,
      isCustom: true,
      createdAt: new Date().toISOString()
    });

    saveCustomBooks(customBooks);
    form.reset();
    renderAdminUploadedBooks();
    renderHomeCategories();
    renderBooksPageCategories();
    renderCategoryPage();
    const sourceSummary = rokomariUrl && (qrImageData || qrImageUrl)
      ? "link + qr"
      : rokomariUrl
        ? "link"
        : "qr";
    logAdminEvent(`Uploaded book ${title} (${storageMode}, ${sourceSummary})`);

    setStatus(status, "Book uploaded successfully.", false);
  });
}

function initPageLoader() {
  const loader = document.querySelector("[data-page-loader]");
  if (!loader) {
    return;
  }

  const finish = () => {
    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      document.body.classList.remove("loading-active");
    }, 3000);
  };

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish, { once: true });
  }
}

async function initialize() {
  await ensureAdminSeed();
  normalizeSessionRole();
  initPageLoader();
  stripLegacyCustomizationSections();
  ensureCybrlyProfileCustomizeModal();
  ensurePopupModal();
  ensureControlCenterCloseButtons();
  initThemeToggle();
  ensureHeaderScrollIndicator();
  initCustomSelects();
  initCustomFileInputs();
  initPasswordVisibilityToggles();

  bindControlCenter();
  registerControlCenterVisit();
  if (document.body.dataset.controlTimeBound !== "1") {
    document.body.dataset.controlTimeBound = "1";
    window.addEventListener("beforeunload", () => {
      persistControlCenterSessionTime();
    });
  }
  refreshControlCenter();
  initSocialLinks();

  renderHomeCategories();
  renderBooksPageCategories();
  initBookSearchFilters();
  renderCategoryPage();
  renderBookDetail();
  initUniversalScrollAnimations();

  initContactForm();
  await initSignupForm();
  await initLoginForm();
  initDashboardPage();
  initLogsPage();
  initAdminPage();
  initChatbotAsync();
}

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch(() => {
    // Keep UI available in fallback mode.
  });
});
