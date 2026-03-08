const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 4100);
const ROOT_DIR = __dirname;
const USERS_FILE = path.join(ROOT_DIR, "users.json");
const SESSIONS_FILE = path.join(ROOT_DIR, "sessions.json");
const FEEDBACK_FILE = path.join(ROOT_DIR, "feedback.json");
const OWNER_EMAIL = "abirxxdbrine2024@gmail.com";
const OWNER_PASSWORD_VISIBLE = Buffer.from("I3lvdXR1YmVyIzY5Iw==", "base64").toString("utf8");
const OWNER_PASSWORD_HASH = "4f5ee7a58581ac12f6e04bdcc24add36735a0c8d4d988eae78774554ed101dbb";
const OWNER_NAME = "Abir";

function ensureFile(filePath, fallbackJson) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackJson, null, 2), "utf8");
  }
}

function readJson(filePath, fallbackJson) {
  ensureFile(filePath, fallbackJson);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallbackJson;
  }
}

function writeJson(filePath, payload) {
  ensureFile(filePath, payload);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getUsersStore() {
  return readJson(USERS_FILE, { users: [] });
}

function getSessionsStore() {
  return readJson(SESSIONS_FILE, { sessions: [] });
}

function getFeedbackStore() {
  return readJson(FEEDBACK_FILE, { feedback: [], updates: [], bugReports: [] });
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password || ""))
    .digest("hex");
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    id: String(user.id || ""),
    username: String(user.username || ""),
    role: String(user.role || "user"),
    displayName: String(user.displayName || user.username || "")
  };
}

function sanitizeCredentialUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const rawPassword = String(user.passwordVisible || user.password || "");

  return {
    id: String(user.id || ""),
    username: String(user.username || ""),
    role: String(user.role || "user"),
    displayName: String(user.displayName || user.username || ""),
    createdAt: String(user.createdAt || ""),
    password: rawPassword,
    passwordVisible: rawPassword
  };
}

function ensureOwnerUser() {
  const usersStore = getUsersStore();
  const users = Array.isArray(usersStore.users) ? usersStore.users : [];
  const existingIndex = users.findIndex((entry) => normalizeUsername(entry.username) === normalizeUsername(OWNER_EMAIL));
  if (existingIndex >= 0) {
    const existing = users[existingIndex] || {};
    users[existingIndex] = {
      ...existing,
      id: String(existing.id || randomId("owner")),
      username: OWNER_EMAIL,
      passwordVisible: OWNER_PASSWORD_VISIBLE,
      passwordHash: OWNER_PASSWORD_HASH,
      role: "owner",
      displayName: OWNER_NAME
    };
    delete users[existingIndex].password;
  } else {
    users.push({
      id: randomId("owner"),
      username: OWNER_EMAIL,
      passwordVisible: OWNER_PASSWORD_VISIBLE,
      passwordHash: OWNER_PASSWORD_HASH,
      role: "owner",
      displayName: OWNER_NAME
    });
  }

  usersStore.users = users;
  writeJson(USERS_FILE, usersStore);
}

function getSessionUser(token) {
  if (!token) {
    return null;
  }

  const sessionsStore = getSessionsStore();
  const sessions = Array.isArray(sessionsStore.sessions) ? sessionsStore.sessions : [];
  const session = sessions.find((entry) => String(entry.token || "") === String(token));
  if (!session) {
    return null;
  }

  const usersStore = getUsersStore();
  const users = Array.isArray(usersStore.users) ? usersStore.users : [];
  const user = users.find((entry) => normalizeUsername(entry.username) === normalizeUsername(session.username));
  return user || null;
}

function getAuthToken(request) {
  const value = String(request.headers.authorization || "");
  if (!value.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return value.slice(7).trim();
}

function requireAuth(request, response, next) {
  const token = getAuthToken(request);
  const user = getSessionUser(token);
  if (!user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  request.authToken = token;
  request.authUser = user;
  next();
}

function requireOwner(request, response, next) {
  if (!request.authUser || String(request.authUser.role) !== "owner") {
    response.status(403).json({ message: "Owner access required." });
    return;
  }
  next();
}

function syncBugReportMirror(store, changedFeedback) {
  if (!store || !Array.isArray(store.feedback)) {
    return;
  }

  const bugList = store.feedback.filter((entry) => String(entry.type || "") === "bug");
  store.bugReports = bugList.map((entry) => ({
    id: entry.id,
    author: entry.author,
    role: entry.role,
    content: entry.content,
    createdAt: entry.createdAt,
    replies: Array.isArray(entry.replies) ? entry.replies : [],
    votes: entry.votes || { up: [], down: [] }
  }));

  if (changedFeedback && String(changedFeedback.type || "") === "bug") {
    const existing = store.bugReports.find((entry) => entry.id === changedFeedback.id);
    if (!existing) {
      store.bugReports.unshift({
        id: changedFeedback.id,
        author: changedFeedback.author,
        role: changedFeedback.role,
        content: changedFeedback.content,
        createdAt: changedFeedback.createdAt,
        replies: changedFeedback.replies || [],
        votes: changedFeedback.votes || { up: [], down: [] }
      });
    }
  }
}

ensureOwnerUser();

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "e-zone-json-api" });
});

app.post("/api/auth/register", (request, response) => {
  const usernameRaw = String(request.body && request.body.username ? request.body.username : "").trim();
  const password = String(request.body && request.body.password ? request.body.password : "");
  const displayName = String(request.body && request.body.displayName ? request.body.displayName : usernameRaw).trim();

  if (!usernameRaw || !password) {
    response.status(400).json({ message: "Username and password are required." });
    return;
  }

  if (password.length < 6) {
    response.status(400).json({ message: "Password must be at least 6 characters." });
    return;
  }

  const usersStore = getUsersStore();
  const users = Array.isArray(usersStore.users) ? usersStore.users : [];
  const normalized = normalizeUsername(usernameRaw);
  const exists = users.some((entry) => normalizeUsername(entry.username) === normalized);
  if (exists) {
    response.status(409).json({ message: "Username already exists." });
    return;
  }

  const user = {
    id: randomId("user"),
    username: usernameRaw,
    passwordHash: hashPassword(password),
    passwordVisible: password,
    role: "user",
    displayName: displayName || usernameRaw,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  usersStore.users = users;
  writeJson(USERS_FILE, usersStore);

  response.status(201).json({
    message: "Registration successful.",
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/login", (request, response) => {
  const usernameRaw = String(request.body && request.body.username ? request.body.username : "").trim();
  const password = String(request.body && request.body.password ? request.body.password : "");

  if (!usernameRaw || !password) {
    response.status(400).json({ message: "Username and password are required." });
    return;
  }

  const usersStore = getUsersStore();
  const users = Array.isArray(usersStore.users) ? usersStore.users : [];
  const user = users.find((entry) => normalizeUsername(entry.username) === normalizeUsername(usernameRaw));
  const incomingHash = hashPassword(password);
  const storedHash = user
    ? String(user.passwordHash || hashPassword(String(user.password || "")))
    : "";
  if (!user || storedHash !== incomingHash) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  if (String(user.passwordVisible || "") !== password || String(user.passwordHash || "") !== incomingHash) {
    user.passwordVisible = password;
    user.passwordHash = incomingHash;
    usersStore.users = users;
    writeJson(USERS_FILE, usersStore);
  }

  const token = randomId("session");
  const sessionsStore = getSessionsStore();
  const sessions = Array.isArray(sessionsStore.sessions) ? sessionsStore.sessions : [];
  sessions.push({
    token,
    username: user.username,
    createdAt: new Date().toISOString()
  });
  sessionsStore.sessions = sessions.slice(-800);
  writeJson(SESSIONS_FILE, sessionsStore);

  response.json({
    message: "Login successful.",
    token,
    user: sanitizeUser(user)
  });
});

app.get("/api/auth/me", requireAuth, (request, response) => {
  response.json({
    user: sanitizeUser(request.authUser)
  });
});

app.post("/api/auth/logout", requireAuth, (request, response) => {
  const sessionsStore = getSessionsStore();
  const sessions = Array.isArray(sessionsStore.sessions) ? sessionsStore.sessions : [];
  sessionsStore.sessions = sessions.filter((entry) => String(entry.token || "") !== String(request.authToken));
  writeJson(SESSIONS_FILE, sessionsStore);
  response.json({ message: "Logged out." });
});

app.get("/api/feedback", requireAuth, (_request, response) => {
  const store = getFeedbackStore();
  const feedback = Array.isArray(store.feedback) ? store.feedback : [];
  const updates = Array.isArray(store.updates) ? store.updates : [];
  response.json({
    feedback,
    updates,
    bugReports: Array.isArray(store.bugReports) ? store.bugReports : []
  });
});

app.post("/api/feedback", requireAuth, (request, response) => {
  const type = String(request.body && request.body.type ? request.body.type : "").trim().toLowerCase();
  const content = String(request.body && request.body.content ? request.body.content : "").trim();

  if (!["feature", "bug"].includes(type)) {
    response.status(400).json({ message: "Type must be feature or bug." });
    return;
  }
  if (!content) {
    response.status(400).json({ message: "Feedback content is required." });
    return;
  }

  const store = getFeedbackStore();
  const feedback = Array.isArray(store.feedback) ? store.feedback : [];
  const next = {
    id: randomId("fb"),
    author: request.authUser.displayName || request.authUser.username,
    authorUsername: request.authUser.username,
    role: request.authUser.role,
    type,
    content,
    createdAt: new Date().toISOString(),
    replies: [],
    votes: {
      up: [],
      down: []
    }
  };

  feedback.unshift(next);
  store.feedback = feedback;
  syncBugReportMirror(store, next);
  writeJson(FEEDBACK_FILE, store);

  response.status(201).json({
    message: "Feedback submitted.",
    feedback: next
  });
});

app.post("/api/feedback/:feedbackId/replies", requireAuth, (request, response) => {
  const feedbackId = String(request.params.feedbackId || "");
  const content = String(request.body && request.body.content ? request.body.content : "").trim();
  if (!content) {
    response.status(400).json({ message: "Reply content is required." });
    return;
  }

  const store = getFeedbackStore();
  const feedback = Array.isArray(store.feedback) ? store.feedback : [];
  const target = feedback.find((entry) => String(entry.id) === feedbackId);
  if (!target) {
    response.status(404).json({ message: "Feedback not found." });
    return;
  }

  const reply = {
    id: randomId("reply"),
    author: request.authUser.displayName || request.authUser.username,
    role: request.authUser.role,
    content,
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(target.replies)) {
    target.replies = [];
  }
  target.replies.push(reply);

  syncBugReportMirror(store, target);
  writeJson(FEEDBACK_FILE, store);

  response.status(201).json({
    message: "Reply added.",
    reply
  });
});

app.post("/api/feedback/:feedbackId/vote", requireAuth, (request, response) => {
  const feedbackId = String(request.params.feedbackId || "");
  const value = String(request.body && request.body.value ? request.body.value : "").trim().toLowerCase();
  if (!["up", "down"].includes(value)) {
    response.status(400).json({ message: "Vote value must be up or down." });
    return;
  }

  const store = getFeedbackStore();
  const feedback = Array.isArray(store.feedback) ? store.feedback : [];
  const target = feedback.find((entry) => String(entry.id) === feedbackId);
  if (!target) {
    response.status(404).json({ message: "Feedback not found." });
    return;
  }

  const username = String(request.authUser.username || "");
  if (!target.votes || typeof target.votes !== "object") {
    target.votes = { up: [], down: [] };
  }
  if (!Array.isArray(target.votes.up)) {
    target.votes.up = [];
  }
  if (!Array.isArray(target.votes.down)) {
    target.votes.down = [];
  }

  target.votes.up = target.votes.up.filter((entry) => entry !== username);
  target.votes.down = target.votes.down.filter((entry) => entry !== username);
  target.votes[value].push(username);

  syncBugReportMirror(store, target);
  writeJson(FEEDBACK_FILE, store);

  response.json({
    message: "Vote updated.",
    votes: target.votes
  });
});

app.post("/api/updates", requireAuth, requireOwner, (request, response) => {
  const title = String(request.body && request.body.title ? request.body.title : "").trim();
  const content = String(request.body && request.body.content ? request.body.content : "").trim();
  if (!title || !content) {
    response.status(400).json({ message: "Title and content are required." });
    return;
  }

  const store = getFeedbackStore();
  const updates = Array.isArray(store.updates) ? store.updates : [];
  const update = {
    id: randomId("upd"),
    title,
    content,
    author: request.authUser.displayName || request.authUser.username,
    role: request.authUser.role,
    createdAt: new Date().toISOString()
  };
  updates.unshift(update);
  store.updates = updates;
  writeJson(FEEDBACK_FILE, store);

  response.status(201).json({
    message: "Update published.",
    update
  });
});

app.get("/api/owner/users", requireAuth, requireOwner, (_request, response) => {
  const usersStore = getUsersStore();
  const users = Array.isArray(usersStore.users) ? usersStore.users : [];
  response.json({
    users: users.map(sanitizeCredentialUser).filter(Boolean)
  });
});

app.use(express.static(ROOT_DIR));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`e-Zone JSON API running at http://localhost:${PORT}`);
});
