
const STORAGE_KEYS = {
  users: "ezone_users_v3",
  session: "ezone_session_v3",
  customBooks: "ezone_custom_books_v3",
  theme: "ezone_theme_v1",
  accountPrefs: "ezone_account_prefs_v1"
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

const DEFAULT_BOOKS = [
  createDefaultBook("love-romance-1", "Moonlight Promise", "A. Nila", "Bangla", "Love and Romance", 290, true),
  createDefaultBook("love-romance-2", "Letters in Rain", "S. Karim", "English", "Love and Romance", 320, true),
  createDefaultBook("love-romance-3", "Neon Heartline", "M. Rahman", "English", "Love and Romance", 350, true),
  createDefaultBook("love-romance-4", "Silent Bloom", "R. Tania", "Bangla", "Love and Romance", 270, false),
  createDefaultBook("fiction-1", "City of Echoes", "T. Hasan", "English", "Fiction", 330, true),
  createDefaultBook("fiction-2", "Golper Shehor", "F. Noor", "Bangla", "Fiction", 280, true),
  createDefaultBook("fiction-3", "Mirage Code", "L. Azad", "English", "Fiction", 370, true),
  createDefaultBook("fiction-4", "Broken Compass", "R. Das", "Bangla", "Fiction", 300, false),
  createDefaultBook("nonfiction-1", "Atomic Routine", "S. Hridoy", "English", "Non-fiction", 340, true),
  createDefaultBook("nonfiction-2", "Shomoyer Byabosthapona", "N. Jahan", "Bangla", "Non-fiction", 260, true),
  createDefaultBook("nonfiction-3", "Deep Work Notes", "P. Arif", "English", "Non-fiction", 360, true),
  createDefaultBook("nonfiction-4", "Career Reset", "D. Islam", "Bangla", "Non-fiction", 310, false),
  createDefaultBook("sci-fi-1", "Orbit 2099", "I. Mahin", "English", "Science Fiction", 390, true),
  createDefaultBook("sci-fi-2", "Nokkhotro Jatra", "B. Raihan", "Bangla", "Science Fiction", 320, true),
  createDefaultBook("sci-fi-3", "Quantum Drift", "S. Farhan", "English", "Science Fiction", 410, true),
  createDefaultBook("sci-fi-4", "Future Dhaka", "A. Mrittika", "Bangla", "Science Fiction", 350, false)
];
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
  if (!userId) {
    return {
      displayName: "",
      bio: "",
      accent: ""
    };
  }

  const prefsMap = getAccountPrefsMap();
  const saved = prefsMap[userId];
  if (!saved || typeof saved !== "object") {
    return {
      displayName: "",
      bio: "",
      accent: ""
    };
  }

  return {
    displayName: String(saved.displayName || ""),
    bio: String(saved.bio || ""),
    accent: String(saved.accent || "")
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
    accent: String(prefs.accent || "")
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

function updateThemeToggleLabels(theme) {
  const isDark = theme === "dark";
  const nextLabel = isDark ? "Light" : "Dark";
  const marker = isDark ? "L" : "D";

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", `Switch to ${nextLabel} mode`);
    button.setAttribute("title", `Switch to ${nextLabel} mode`);
    button.innerHTML = `<span aria-hidden="true">${marker}</span><span>${nextLabel}</span>`;
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
  document.querySelectorAll(".control-center").forEach((control) => {
    if (control.querySelector("[data-theme-toggle]")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.dataset.themeToggle = "1";
    control.prepend(button);
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

  const saved = getStoredTheme();
  applyTheme(saved || getPreferredTheme());
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

function closeControlMenu() {
  document.querySelectorAll("[data-user-menu]").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll("[data-user-overlay]").forEach((overlay) => overlay.classList.remove("open"));
}

function openControlMenu() {
  document.querySelectorAll("[data-user-menu]").forEach((menu) => menu.classList.add("open"));
  document.querySelectorAll("[data-user-overlay]").forEach((overlay) => overlay.classList.add("open"));
}

function refreshControlCenter() {
  const session = getSession();
  const isLoggedIn = Boolean(session);
  const isAdmin = Boolean(session && session.role === "admin");
  const prefs = session ? getAccountPrefs(session.id) : null;
  const displayName = prefs && prefs.displayName ? prefs.displayName : (session ? session.name : "");

  document.querySelectorAll("[data-profile-avatar]").forEach((el) => {
    el.textContent = isLoggedIn ? getInitials(displayName, "EZ") : "CC";
  });

  document.querySelectorAll("[data-profile-email]").forEach((el) => {
    el.textContent = isLoggedIn ? session.email : "Open account panel";
  });

  document.querySelectorAll("[data-user-role-label]").forEach((el) => {
    el.textContent = isLoggedIn ? (isAdmin ? "Admin Access" : "User Access") : "Account Access";
  });

  document.querySelectorAll("[data-user-menu-title]").forEach((el) => {
    el.textContent = isLoggedIn ? "Account Control Center" : "Access Control Center";
  });

  document.querySelectorAll("[data-user-menu-sub]").forEach((el) => {
    el.textContent = isLoggedIn
      ? "Manage account actions, uploads, and secure session controls."
      : "Login or register to unlock account controls.";
  });

  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = isLoggedIn ? displayName : "Not Signed In";
  });

  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = isLoggedIn ? session.email : "Use Login / Register";
  });

  document.querySelectorAll("[data-user-role-badge]").forEach((el) => {
    el.textContent = isLoggedIn ? (isAdmin ? "Admin" : "User") : "Visitor";
  });

  document.querySelectorAll("[data-menu-login], [data-menu-signup]").forEach((el) => {
    el.classList.toggle("hidden", isLoggedIn);
  });

  document.querySelectorAll("[data-menu-account], [data-menu-logout]").forEach((el) => {
    el.classList.toggle("hidden", !isLoggedIn);
  });

  document.querySelectorAll("[data-menu-admin]").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });

  applyUserAccent();
}

function bindControlCenter() {
  document.querySelectorAll("[data-user-menu-trigger]").forEach((trigger) => {
    if (trigger.dataset.bound === "1") {
      return;
    }

    trigger.dataset.bound = "1";
    trigger.addEventListener("click", () => {
      const menu = document.querySelector("[data-user-menu]");
      if (!menu) {
        return;
      }

      if (menu.classList.contains("open")) {
        closeControlMenu();
      } else {
        openControlMenu();
      }
    });
  });

  document.querySelectorAll("[data-user-overlay]").forEach((overlay) => {
    if (overlay.dataset.bound === "1") {
      return;
    }

    overlay.dataset.bound = "1";
    overlay.addEventListener("click", () => {
      closeControlMenu();
    });
  });

  document.querySelectorAll("[data-menu-account]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }

    button.dataset.bound = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      closeControlMenu();
      openAccountModal();
    });
  });

  document.querySelectorAll("[data-action='logout'], [data-menu-logout]").forEach((button) => {
    if (button.dataset.bound === "1") {
      return;
    }

    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      clearSession();
      closeControlMenu();
      refreshControlCenter();
      window.location.href = "index.html";
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeControlMenu();
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
      role: user.role
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
      role: user.role || "user"
    });

    refreshControlCenter();
    setStatus(status, "Login successful. Redirecting...", false);

    window.setTimeout(() => {
      window.location.href = user.role === "admin" ? "admin.html" : "index.html";
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

function initAdminPage() {
  const panel = document.getElementById("admin-panel");
  if (!panel) {
    return;
  }

  const guard = document.getElementById("admin-guard");
  const session = getSession();
  const isAdmin = Boolean(session && session.role === "admin");

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
        const next = getCustomBooks().filter((book) => book.id !== id);
        saveCustomBooks(next);
        renderAdminUploadedBooks();
        renderHomeCategories();
        renderBooksPageCategories();
        renderCategoryPage();
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
  initThemeToggle();
  initAccountCustomizationModal();
  initCustomSelects();

  bindControlCenter();
  refreshControlCenter();
  initSocialLinks();

  renderHomeCategories();
  renderBooksPageCategories();
  renderCategoryPage();
  renderBookDetail();

  initContactForm();
  await initSignupForm();
  await initLoginForm();
  initAdminPage();
}

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch(() => {
    // Keep UI available in fallback mode.
  });
});
