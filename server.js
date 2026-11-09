import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const root = process.env.VERCEL ? process.cwd() : path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const usersFile = path.join(dataDir, "users.json");
const port = Number(process.env.PORT || 5173);
const codeTtlMs = 15 * 60 * 1000;
const resetTtlMs = 30 * 60 * 1000;
const resendWaitMs = 30 * 1000;
const maxCodeAttempts = 5;

loadEnv(path.join(root, ".env"));

const sessions = new Map();
let writeQueue = Promise.resolve();

export default async function handleRequest(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/animals") {
      sendJson(res, 200, { animals: readAnimals() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/animals") {
      await createAnimal(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    if (req.method === "GET") {
      serveStatic(res, url.pathname);
      return;
    }
    sendJson(res, 405, { error: "Метод не підтримується" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Щось пішло не так" });
  }
}

if (!process.env.VERCEL) {
  createServer(handleRequest).listen(port, "127.0.0.1", () => {
    console.log(`Dim Sirka is running at http://127.0.0.1:${port}`);
  });
}

async function handleApi(req, res, pathname) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Некоректний запит" });
    return;
  }

  if (pathname === "/api/register") return register(res, body);
  if (pathname === "/api/verify") return verifyEmail(req, res, body);
  if (pathname === "/api/resend") return resendCode(res, body);
  if (pathname === "/api/login") return login(res, body);
  if (pathname === "/api/logout") return logout(req, res);
  if (pathname === "/api/profile") return saveName(req, res, body);
  if (pathname === "/api/forgot") return forgotPassword(req, res, body);
  if (pathname === "/api/reset") return resetPassword(res, body);
  sendJson(res, 404, { error: "Не знайдено" });
}

async function register(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!isEmail(email)) {
    sendJson(res, 400, { error: "Введи емайл у вигляді name@example.com" });
    return;
  }
  if (password.length < 8) {
    sendJson(res, 400, { error: "Пароль має містити не менше 8 символів" });
    return;
  }

  const existing = await findUser(email);
  if (existing?.verified) {
    sendJson(res, 409, { error: "Ця пошта вже зареєстрована. Увійди або віднови пароль." });
    return;
  }
  if (existing && Date.now() - existing.verifySentAt < resendWaitMs) {
    sendJson(res, 429, { error: "Код уже надіслано. Зачекай пів хвилини і спробуй ще раз." });
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const user = {
    email,
    passwordHash: await hashSecret(password),
    name: existing?.name || "",
    verified: false,
    verifyCodeHash: await hashSecret(code),
    verifyExpires: Date.now() + codeTtlMs,
    verifySentAt: Date.now(),
    verifyAttempts: 0,
    resetTokenHash: "",
    resetExpires: 0,
  };

  try {
    await sendEmail({
      to: email,
      subject: "Код підтвердження — Дім Сірка",
      html: `<p>Твій код підтвердження: <strong>${code}</strong></p><p>Він діє 15 хвилин.</p>`,
    });
  } catch (error) {
    sendJson(res, 502, { error: mailErrorMessage(error) });
    return;
  }

  await saveUser(user);
  sendJson(res, 200, { ok: true });
}

async function verifyEmail(req, res, body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const user = await findUser(email);
  if (!user || user.verified || !user.verifyCodeHash || user.verifyExpires < Date.now()) {
    sendJson(res, 400, { error: "Код не підходить або час його дії минув." });
    return;
  }
  if (user.verifyAttempts >= maxCodeAttempts) {
    sendJson(res, 400, { error: "Забагато спроб. Надішли код ще раз." });
    return;
  }

  const matches = await verifySecret(code, user.verifyCodeHash);
  if (!matches) {
    user.verifyAttempts += 1;
    await saveUser(user);
    sendJson(res, 400, { error: "Код не підходить або час його дії минув." });
    return;
  }

  user.verified = true;
  user.verifyCodeHash = "";
  user.verifyExpires = 0;
  user.verifyAttempts = 0;
  await saveUser(user);
  sendJson(res, 200, { ok: true }, { "set-cookie": sessionCookie(createSession(email)) });
}

async function resendCode(res, body) {
  const email = normalizeEmail(body.email);
  const user = await findUser(email);
  if (!user || user.verified) {
    sendJson(res, 400, { error: "Немає реєстрації, яка чекає на код." });
    return;
  }
  if (Date.now() - user.verifySentAt < resendWaitMs) {
    sendJson(res, 429, { error: "Код уже надіслано. Зачекай пів хвилини і спробуй ще раз." });
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  try {
    await sendEmail({
      to: email,
      subject: "Код підтвердження — Дім Сірка",
      html: `<p>Твій код підтвердження: <strong>${code}</strong></p><p>Він діє 15 хвилин.</p>`,
    });
  } catch (error) {
    sendJson(res, 502, { error: mailErrorMessage(error) });
    return;
  }

  user.verifyCodeHash = await hashSecret(code);
  user.verifyExpires = Date.now() + codeTtlMs;
  user.verifySentAt = Date.now();
  user.verifyAttempts = 0;
  await saveUser(user);
  sendJson(res, 200, { ok: true });
}

async function login(res, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = await findUser(email);
  const passwordOk = user ? await verifySecret(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    sendJson(res, 401, { error: "Невірний емайл або пароль." });
    return;
  }
  if (!user.verified) {
    sendJson(res, 403, { error: "Спочатку підтверди пошту кодом із листа.", unverified: true });
    return;
  }
  sendJson(res, 200, { ok: true, name: user.name }, { "set-cookie": sessionCookie(createSession(email)) });
}

function logout(req, res) {
  const token = readCookie(req, "session");
  if (token) sessions.delete(token);
  sendJson(res, 200, { ok: true }, { "set-cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
}

async function saveName(req, res, body) {
  const email = sessionEmail(req);
  const name = String(body.name || "").trim();
  if (!email) {
    sendJson(res, 401, { error: "Спочатку підтверди пошту." });
    return;
  }
  if (!name) {
    sendJson(res, 400, { error: "Введи ім'я." });
    return;
  }
  const user = await findUser(email);
  if (!user?.verified) {
    sendJson(res, 401, { error: "Спочатку підтверди пошту." });
    return;
  }
  user.name = name;
  await saveUser(user);
  sendJson(res, 200, { ok: true, name });
}

async function forgotPassword(req, res, body) {
  const email = normalizeEmail(body.email);
  const message = "Якщо ця пошта зареєстрована, ми надіслали лист із посиланням.";
  if (!isEmail(email)) {
    sendJson(res, 400, { error: "Введи емайл у вигляді name@example.com" });
    return;
  }

  const user = await findUser(email);
  if (user?.verified) {
    const token = randomBytes(32).toString("hex");
    const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
    try {
      await sendEmail({
        to: email,
        subject: "Відновлення пароля — Дім Сірка",
        html: `<p>Щоб задати новий пароль, відкрий це посилання. Воно діє 30 хвилин.</p><p><a href="${origin}/?reset=${token}">Задати новий пароль</a></p>`,
      });
      user.resetTokenHash = sha256(token);
      user.resetExpires = Date.now() + resetTtlMs;
      await saveUser(user);
    } catch (error) {
      sendJson(res, 502, { error: mailErrorMessage(error) });
      return;
    }
  }

  sendJson(res, 200, { ok: true, message });
}

async function resetPassword(res, body) {
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (password.length < 8) {
    sendJson(res, 400, { error: "Пароль має містити не менше 8 символів" });
    return;
  }
  const tokenHash = sha256(token);
  const users = await readUsers();
  const user = users.find((item) => item.resetTokenHash && item.resetTokenHash === tokenHash);
  if (!user || user.resetExpires < Date.now()) {
    sendJson(res, 400, { error: "Посилання недійсне або час його дії минув." });
    return;
  }
  user.passwordHash = await hashSecret(password);
  user.resetTokenHash = "";
  user.resetExpires = 0;
  await saveUser(user);
  sendJson(res, 200, { ok: true });
}

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const error = new Error("missing key");
    error.code = "NO_KEY";
    throw error;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Dim Sirka <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!response.ok) {
    const error = new Error(await response.text());
    error.code = "RESEND";
    throw error;
  }
}

function mailErrorMessage(error) {
  if (error.code === "NO_KEY") {
    return "Додай ключ Resend у файл .env (RESEND_API_KEY), інакше лист не надішлеться.";
  }
  const text = String(error.message || "");
  if (/only send testing emails to your own email|domain is not verified/i.test(text)) {
    return "Resend поки надсилає тестові листи лише на пошту власника ключа. Підтверди домен у Resend, щоб писати на будь-яку адресу.";
  }
  return "Не вдалося надіслати лист. Перевір ключ Resend і спробуй ще раз.";
}

function createSession(email) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, email);
  return token;
}

function sessionCookie(token) {
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}`;
}

function sessionEmail(req) {
  return sessions.get(readCookie(req, "session")) || "";
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(secret, salt, 32);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifySecret(secret, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hex] = stored.split(":");
  const derived = await scryptAsync(secret, salt, 32);
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

async function findUser(email) {
  const users = await readUsers();
  return users.find((user) => user.email === email) || null;
}

function saveUser(user) {
  return mutateUsers((users) => {
    const index = users.findIndex((item) => item.email === user.email);
    if (index === -1) users.push(user);
    else users[index] = user;
  });
}

function readUsers() {
  return mutateUsers((users) => users);
}

function mutateUsers(change) {
  const run = writeQueue.then(async () => {
    mkdirSync(dataDir, { recursive: true });
    const users = existsSync(usersFile) ? JSON.parse(readFileSync(usersFile, "utf8")) : [];
    const result = await change(users);
    const temporary = `${usersFile}.tmp`;
    writeFileSync(temporary, JSON.stringify(users, null, 2));
    renameSync(temporary, usersFile);
    return result === undefined ? users : result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const animalsFile = path.join(dataDir, "animals.json");
const uploadsDir = path.join(root, "assets", "uploads");
const animalTags = new Set(["war", "violence", "adopt", "no-curator"]);

function readAnimals() {
  if (!existsSync(animalsFile)) return [];
  const animals = JSON.parse(readFileSync(animalsFile, "utf8"));
  return Array.isArray(animals) ? animals : [];
}

function saveAnimals(animals) {
  mkdirSync(dataDir, { recursive: true });
  const temporary = `${animalsFile}.tmp`;
  writeFileSync(temporary, JSON.stringify(animals, null, 2));
  renameSync(temporary, animalsFile);
}

function ageLabelFromYears(years) {
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    const word = months === 1 ? "місяць" : months < 5 ? "місяці" : "місяців";
    return `${months} ${word}`;
  }
  const rounded = Math.round(years);
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? "рік" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "роки" : "років";
  return `${rounded} ${word}`;
}

function speciesLabel(kind, sex) {
  if (kind === "dog") return sex === "Дівчинка" ? "Собачка" : "Песик";
  return sex === "Дівчинка" ? "Кішечка" : "Котик";
}

function healthLabel(healthKey, sex) {
  if (healthKey === "treatment") return "На лікуванні";
  return sex === "Дівчинка" ? "Здорова" : "Здоровий";
}

function saveUpload(dataUrl, id) {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ""));
  if (!match) {
    const error = new Error("photo");
    error.status = 400;
    error.publicMessage = "Додай фото у форматі JPG, PNG або WebP.";
    throw error;
  }
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 2_000_000) {
    const error = new Error("photo-size");
    error.status = 400;
    error.publicMessage = "Фото має бути не більше 2 МБ.";
    throw error;
  }
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  mkdirSync(uploadsDir, { recursive: true });
  const filename = `${id}.${ext}`;
  writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/assets/uploads/${filename}`;
}

async function createAnimal(req, res) {
  let body;
  try {
    body = await readBody(req, 12_000_000);
  } catch {
    sendJson(res, 400, { error: "Запит завеликий або пошкоджений." });
    return;
  }

  const name = String(body.name || "").trim();
  const kind = body.kind === "cat" ? "cat" : body.kind === "dog" ? "dog" : "";
  const sex = body.sex === "Дівчинка" || body.sex === "Хлопчик" ? body.sex : "";
  const years = Number(body.years);
  const healthKey = body.healthKey === "treatment" ? "treatment" : body.healthKey === "healthy" ? "healthy" : "";
  const goal = Number(body.goal);
  const raised = 0;
  const tags = Array.isArray(body.tags) ? [...new Set(body.tags.filter((tag) => animalTags.has(tag)))] : [];
  if (!name || !kind || !sex || !healthKey || !Number.isFinite(years) || years <= 0 || years > 30) {
    sendJson(res, 400, { error: "Заповни ім’я, вид, стать, вік і здоров’я." });
    return;
  }
  if (!Number.isFinite(goal) || goal <= 0) {
    sendJson(res, 400, { error: "Вкажи ціль збору." });
    return;
  }

  const sources = Array.isArray(body.photos) ? body.photos : [];
  if (!sources.length || sources.length > 8) {
    sendJson(res, 400, { error: "Додай від одного до восьми фото." });
    return;
  }

  const id = `animal-${Date.now().toString(36)}`;
  let photos;
  try {
    photos = sources.map((source, index) => saveUpload(source, `${id}-${index}`));
  } catch (error) {
    sendJson(res, error.status || 400, { error: error.publicMessage || "Не вдалося зберегти фото." });
    return;
  }

  const animal = {
    id,
    name,
    species: speciesLabel(kind, sex),
    kind,
    sex,
    years,
    ageLabel: ageLabelFromYears(years),
    healthKey,
    health: healthLabel(healthKey, sex),
    tags,
    fullCare: Boolean(body.fullCare),
    raised,
    goal,
    photo: photos[0],
    cardPhoto: photos[0],
    photos,
    story: [String(body.storyLead || "").trim(), ""],
    curators: [],
  };
  const animals = readAnimals();
  animals.unshift(animal);
  saveAnimals(animals);
  sendJson(res, 200, { animal });
}

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(payload));
}

function serveStatic(res, pathname) {
  const file = staticFile(pathname);
  if (!file) {
    sendJson(res, 404, { error: "Не знайдено" });
    return;
  }
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
}

function staticFile(pathname) {
  if (pathname === "/") return path.join(root, "index.html");
  if (pathname === "/admin" || pathname === "/admin/") return path.join(root, "admin", "index.html");
  if (pathname === "/admin/admin.css") return path.join(root, "admin", "admin.css");
  if (pathname === "/admin/admin.js") return path.join(root, "admin", "admin.js");
  const allowed = new Set(["/index.html", "/app.js", "/styles.css"]);
  if (allowed.has(pathname)) return path.join(root, pathname.slice(1));
  if (!pathname.startsWith("/assets/")) return "";
  const full = path.resolve(root, `.${pathname}`);
  const assetsRoot = path.join(root, "assets") + path.sep;
  if (!full.startsWith(assetsRoot) || !existsSync(full)) return "";
  return full;
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
