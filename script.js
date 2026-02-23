
const STORAGE_KEYS = {
  users: "ezone_users_v3",
  session: "ezone_session_v3",
  customBooks: "ezone_custom_books_v3",
  theme: "ezone_theme_v1",
  accountPrefs: "ezone_account_prefs_v1",
  controlCenterLogs: "ezone_control_center_logs_v1"
};

const ADMIN_ACCOUNT = {
  name: "e-Zone Admin",
  email: "abirxxdbrine2024@gmail.com",
  password: "6769#6967",
  role: "admin"
};

const CATEGORIES = [
  "Love and Romance",
  "Fiction",
  "Non-fiction",
  "Science Fiction"
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
    bookPdfName: `${slugify(title)}.pdf`,
    bookPdfData: "",
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

function getCustomBooks() {
  const books = readStorage(STORAGE_KEYS.customBooks, []);
  return Array.isArray(books) ? books.filter((book) => book && typeof book === "object") : [];
}

function saveCustomBooks(books) {
  writeStorage(STORAGE_KEYS.customBooks, books);
}

function getAccountPrefsMap() {
  const prefs = readStorage(STORAGE_KEYS.accountPrefs, {});
  return prefs && typeof prefs === "object" && !Array.isArray(prefs) ? prefs : {};
}

function saveAccountPrefsMap(prefs) {
  writeStorage(STORAGE_KEYS.accountPrefs, prefs);
}

function getAccountPrefs(userId) {
  const defaults = {
    displayName: "",
    bio: "",
    accent: "",
    theme: "dark",
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
    theme: saved.theme === "light" ? "light" : "dark",
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

  const prefsMap = getAccountPrefsMap();
  prefsMap[userId] = {
    displayName: String(prefs.displayName || ""),
    bio: String(prefs.bio || ""),
    accent: String(prefs.accent || ""),
    theme: prefs.theme === "light" ? "light" : "dark",
    compact: Boolean(prefs.compact),
    layoutDensity: prefs.layoutDensity === "compact" ? "compact" : "comfortable",
    glowIntensity: Math.min(100, Math.max(0, Number(prefs.glowIntensity) || 70)),
    fontScale: Math.min(1.2, Math.max(0.85, Number(prefs.fontScale) || 1)),
    radius: Math.min(32, Math.max(12, Number(prefs.radius) || 20)),
    animationIntensity: prefs.animationIntensity === "reduced" ? "reduced" : "full",
    respectReducedMotion: prefs.respectReducedMotion !== false,
    scrollBehavior: prefs.scrollBehavior === "instant" ? "instant" : "smooth",
    showEmail: prefs.showEmail !== false,
    showActivity: prefs.showActivity !== false,
    publicProfile: prefs.publicProfile !== false,
    showPurchases: prefs.showPurchases !== false
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
  const exists = users.some((user) => normalizeEmail(user.email) === adminEmail);

  if (exists) {
    return;
  }

  const passHash = await hashPassword(ADMIN_ACCOUNT.password);
  users.push({
    id: createId("user"),
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    passHash,
    role: "admin",
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
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
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

let controlCenterSessionStartMs = Date.now();

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
            Theme Mode
            <select class="input select" data-pref-field="theme">
              <option value="dark">Dark (Recommended)</option>
              <option value="light">Light (Not recommended)</option>
            </select>
          </label>
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

function showCybrlyModal(key) {
  const modal = document.querySelector(`[data-modal="${key}"]`);
  if (!modal) {
    return;
  }
  modal.classList.add("show");
  updateControlCenterScrollLock();
}

function hideCybrlyModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.remove("show");
  updateControlCenterScrollLock();
}

function applyCybrlyControlPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") {
    return;
  }
  applyTheme(prefs.theme === "light" ? "light" : "dark");
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
  const isAdmin = Boolean(session && session.role === "admin");
  const prefs = isLoggedIn ? getAccountPrefs(session.id) : null;
  const displayName = isLoggedIn ? (prefs.displayName || session.name || session.email) : "";
  const initials = isLoggedIn ? getInitials(displayName, "DP") : "DP";

  document.body.classList.toggle("admin-mode", isAdmin);

  document.querySelectorAll("[data-user-menu-trigger]").forEach((trigger) => {
    trigger.classList.toggle("hidden", !isLoggedIn);
  });
  document.querySelectorAll('[data-auth-link="login"], [data-auth-link="signup"]').forEach((link) => {
    link.classList.toggle("hidden", isLoggedIn);
  });

  document.querySelectorAll("[data-profile-avatar], [data-user-avatar]").forEach((el) => {
    el.textContent = initials;
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
      : "Track your visit stats and purchase history.";
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
    userDashboard.style.display = isAdmin ? "none" : "grid";
  }
  if (adminDashboard) {
    adminDashboard.style.display = isAdmin ? "grid" : "none";
  }

  if (isLoggedIn && session.email) {
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
    menu.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const actionEl = target.closest("[data-action]");
      const modalEl = target.closest("[data-open-modal]");

      if (actionEl) {
        const action = actionEl.getAttribute("data-action");

        if (action === "logout") {
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
            initCustomSelects();
          }
        }
      }
    });
  }

  document.querySelectorAll("[data-theme-set]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const session = getSession();
      if (!session) {
        return;
      }
      const theme = button.getAttribute("data-theme-set") === "light" ? "light" : "dark";
      const prefs = getAccountPrefs(session.id);
      const next = {
        ...prefs,
        theme
      };
      setAccountPrefs(session.id, next);
      applyCybrlyControlPrefs(next);
      addControlTimeline(normalizeEmail(session.email), `Theme set to ${theme}`);
      refreshControlCenter();
    });
  });

  document.querySelectorAll("[data-pref-toggle]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const session = getSession();
      if (!session) {
        return;
      }
      const key = button.getAttribute("data-pref-toggle");
      if (key !== "compact") {
        return;
      }
      const prefs = getAccountPrefs(session.id);
      const compact = !(prefs.layoutDensity === "compact" || prefs.compact);
      const next = {
        ...prefs,
        compact,
        layoutDensity: compact ? "compact" : "comfortable"
      };
      setAccountPrefs(session.id, next);
      applyCybrlyControlPrefs(next);
      addControlTimeline(normalizeEmail(session.email), `Layout switched to ${next.layoutDensity}`);
      refreshControlCenter();
    });
  });

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
      if (key === "theme") {
        addControlTimeline(normalizeEmail(session.email), `Theme set to ${value === "light" ? "light" : "dark"}`);
      }
      if (key === "layoutDensity") {
        addControlTimeline(normalizeEmail(session.email), `Layout switched to ${next.layoutDensity}`);
      }

      setAccountPrefs(session.id, next);
      applyCybrlyControlPrefs(next);
      refreshControlCenter();
      updateRangeReadout(field, value);

      const status = document.querySelector('[data-modal="profile-customize"] [data-customize-status]');
      if (status) {
        status.textContent = "Saved automatically.";
        status.dataset.state = "success";
      }
    });
  });

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
      ${options.showFileMeta ? `<div class="inline-meta"><span class="meta-pill">Cover: ${escapeHtml(book.coverPdfName || "N/A")}</span><span class="meta-pill">Book: ${escapeHtml(book.bookPdfName || "N/A")}</span></div>` : ""}
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

  root.innerHTML = `
    <div class="book-detail-layout">
      <article class="soft-panel book-detail-main">
        <div class="cover book-detail-cover" data-cover="${encodeURIComponent(book.coverPreview)}"></div>
        <div>
          <span class="section-label">${safeCategory}</span>
          <h2 style="margin:0.55rem 0 0.46rem;">${safeTitle}</h2>
          <p class="book-meta">By ${safeAuthor} · ${safeLang}</p>
          <p class="book-text">${safeDesc}</p>
          <p class="book-price" style="margin:0.45rem 0;">Price: ${formatPrice(book.price)}</p>
          <div class="inline-meta">
            ${book.featured ? '<span class="meta-pill">Featured</span>' : ""}
            ${book.bookPdfName ? `<span class="meta-pill">File: ${escapeHtml(book.bookPdfName)}</span>` : ""}
          </div>
          <div class="actions" style="margin-top:0.65rem;">
            <a class="btn btn-ghost small" href="books.html">Back to Books</a>
          </div>
        </div>
      </article>

      <aside class="soft-panel detail-side">
        <h3>How to Buy This Ebook</h3>
        <ol class="purchase-steps">
          <li>Message e-Zone support with the book title and your email.</li>
          <li>Complete payment using the provided payment instructions.</li>
          <li>Send payment confirmation for verification.</li>
          <li>Receive your ebook PDF after confirmation.</li>
        </ol>
        <p style="margin-top:0.65rem;"><a href="mailto:abirxxdbrine2024@gmail.com">abirxxdbrine2024@gmail.com</a></p>
      </aside>
    </div>
  `;

  hydrateCovers(root);

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
      setStatus(status, "Admin credentials are fixed and cannot be created from registration.", true);
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
      role: user.role,
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
      role: user.role || "user",
      loginAt: new Date().toISOString()
    });

    refreshControlCenter();
    setStatus(status, "Login successful. Redirecting...", false);

    window.setTimeout(() => {
      window.location.href = user.role === "admin" ? "dashboard.html" : "index.html";
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
  const isAdmin = Boolean(session && session.role === "admin");

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
  const isAdmin = Boolean(session && session.role === "admin");

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

function initAdminPage() {
  const panel = document.getElementById("admin-panel");
  if (!panel) {
    return;
  }

  const guard = document.getElementById("admin-guard");
  const session = getSession();
  const isAdmin = Boolean(session && session.role === "admin");
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

  const form = document.getElementById("admin-book-form");
  const status = document.getElementById("admin-status");
  const uploadList = document.getElementById("admin-upload-list");

  renderAdminUploadedBooks();

  if (uploadList && uploadList.dataset.bound !== "1") {
    uploadList.dataset.bound = "1";

    uploadList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const deleteBtn = target.closest("[data-delete-book]");
      if (deleteBtn) {
        const id = decodeURIComponent(deleteBtn.getAttribute("data-delete-book") || "");
        const books = getCustomBooks();
        const deletedBook = books.find((book) => book.id === id);
        const next = books.filter((book) => book.id !== id);
        saveCustomBooks(next);
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
    const bookPdfFile = formData.get("bookPdf");

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

    if (!(bookPdfFile instanceof File) || !validatePdfFile(bookPdfFile)) {
      setStatus(status, "Main book file must be a PDF.", true);
      return;
    }

    if (coverPdfFile.size > 1_600_000 || bookPdfFile.size > 2_300_000) {
      setStatus(status, "PDF files are too large for local demo storage. Use smaller files.", true);
      return;
    }

    let coverPdfData = "";
    let bookPdfData = "";

    try {
      [coverPdfData, bookPdfData] = await Promise.all([
        readFileAsDataUrl(coverPdfFile),
        readFileAsDataUrl(bookPdfFile)
      ]);
    } catch (error) {
      setStatus(status, "Unable to process PDF files.", true);
      return;
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
      bookPdfName: bookPdfFile.name,
      bookPdfData,
      isCustom: true,
      createdAt: new Date().toISOString()
    });

    saveCustomBooks(customBooks);
    form.reset();
    renderAdminUploadedBooks();
    renderHomeCategories();
    renderBooksPageCategories();
    renderCategoryPage();
    logAdminEvent(`Uploaded book ${title}`);

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
  initPageLoader();
  ensureCybrlyProfileCustomizeModal();
  ensureControlCenterCloseButtons();
  initThemeToggle();
  ensureHeaderScrollIndicator();
  initCustomSelects();

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
  renderCategoryPage();
  renderBookDetail();

  initContactForm();
  await initSignupForm();
  await initLoginForm();
  initDashboardPage();
  initLogsPage();
  initAdminPage();
}

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch(() => {
    // Keep UI available in fallback mode.
  });
});
