import { WebSocketServer, WebSocket } from "ws";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page, Cookie } from "puppeteer";
import { parse } from "url";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Server as HttpServer } from "http";

puppeteerExtra.use(StealthPlugin());

const db = new PrismaClient();
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || "", "utf8").slice(0, 32);
const SESSIONS_DIR = path.join(process.cwd(), "server", "sessions");

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function cookiesPath(platformId: string) {
  return path.join(SESSIONS_DIR, `${platformId}.json`);
}

function loadCookies(platformId: string): Cookie[] | null {
  try {
    const file = cookiesPath(platformId);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const now = Date.now() / 1000;
    const valid = data.filter((c: Cookie) => !c.expires || c.expires > now);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function saveCookies(platformId: string, cookies: Cookie[]) {
  try {
    fs.writeFileSync(cookiesPath(platformId), JSON.stringify(cookies, null, 2));
    console.log(`[cookies] Saved ${cookies.length} cookies for ${platformId}`);
  } catch (e) {
    console.error("[cookies] Failed to save:", e);
  }
}

export function clearCookies(platformId: string) {
  try {
    const file = cookiesPath(platformId);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.log(`[cookies] Cleared session for ${platformId}`);
  } catch {}
}

interface Session {
  browser: Browser;
  page: Page;
  ws: WebSocket;
}

const sessions = new Map<WebSocket, Session>();

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[name="user"]',
  'input[name="login"]',
  'input[id="email"]',
  'input[id="username"]',
  'input[autocomplete="email"]',
  'input[autocomplete="username"]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[name="pass"]',
  'input[id="password"]',
  'input[autocomplete="current-password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  '[data-testid="login-button"]',
  '[data-testid="submit"]',
];

async function findSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return sel;
    } catch {}
  }
  return null;
}

async function isSessionValid(page: Page, platformUrl: string, loginUrl: string): Promise<boolean> {
  try {
    const currentUrl = page.url();
    const loginHostname = new URL(loginUrl).hostname;
    const currentHostname = new URL(currentUrl).hostname;
    return (
      currentHostname === loginHostname &&
      !currentUrl.includes("/login") &&
      !currentUrl.includes("/signin") &&
      !currentUrl.includes("/auth") &&
      currentUrl !== loginUrl
    );
  } catch {
    return false;
  }
}

async function performLogin(
  page: Page,
  platform: {
    id: string;
    url: string;
    credential: {
      username: string;
      password: string;
      loginUrl?: string | null;
      loginConfig?: string | null;
    } | null;
  },
  notifyStatus: (msg: string) => void
) {
  const cred = platform.credential;
  if (!cred) {
    notifyStatus("Abrindo plataforma...");
    await page.goto(platform.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return;
  }

  const loginUrl = cred.loginUrl || platform.url;
  const username = decrypt(cred.username);
  const password = decrypt(cred.password);

  const savedCookies = loadCookies(platform.id);
  if (savedCookies && savedCookies.length > 0) {
    notifyStatus("Restaurando sessão guardada...");
    console.log(`[cookies] Loading ${savedCookies.length} saved cookies`);
    await page.setCookie(...savedCookies);

    notifyStatus("Verificando sessão...");
    await page.goto(platform.url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const valid = await isSessionValid(page, platform.url, loginUrl);
    if (valid) {
      notifyStatus("Sessão restaurada! ✓");
      console.log("[cookies] Session restored successfully, skipping login");
      return;
    }

    console.log("[cookies] Session expired, clearing and doing fresh login");
    clearCookies(platform.id);
    notifyStatus("Sessão expirada, fazendo novo login...");
  }

  notifyStatus("Acessando página de login...");
  await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() =>
    page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
  );
  await new Promise((r) => setTimeout(r, 2000));

  let loggedIn = false;

  if (cred.loginConfig) {
    try {
      const config = JSON.parse(cred.loginConfig) as {
        emailSelector: string;
        passwordSelector: string;
        submitSelector: string;
        emailFirst?: boolean;
      };
      notifyStatus("Preenchendo credenciais...");

      if (config.emailFirst) {
        await page.waitForSelector(config.emailSelector, { timeout: 8000 });
        await page.click(config.emailSelector);
        await page.type(config.emailSelector, username, { delay: 70 });
        await page.click(config.submitSelector);
        await new Promise((r) => setTimeout(r, 2500));
        await page.waitForSelector(config.passwordSelector, { timeout: 8000 });
        await page.click(config.passwordSelector);
        await page.type(config.passwordSelector, password, { delay: 70 });
        await page.click(config.submitSelector);
      } else {
        await page.waitForSelector(config.emailSelector, { timeout: 8000 });
        await page.click(config.emailSelector);
        await page.type(config.emailSelector, username, { delay: 70 });
        if (await page.$(config.passwordSelector)) {
          await page.click(config.passwordSelector);
          await page.type(config.passwordSelector, password, { delay: 70 });
        }
        await page.click(config.submitSelector);
      }

      notifyStatus("Aguardando login...");
      await page.waitForNavigation({ timeout: 15000, waitUntil: "domcontentloaded" }).catch(() => {});
      loggedIn = true;
    } catch (err) {
      console.error("[login] config error:", err);
    }
  } else {
    notifyStatus("Detetando formulário de login...");
    console.log("[login] Auto-detecting form...");

    const emailSel = await findSelector(page, EMAIL_SELECTORS);
    const passwordSel = await findSelector(page, PASSWORD_SELECTORS);

    if (emailSel && passwordSel) {
      notifyStatus("Preenchendo email e senha...");
      console.log(`[login] Found: email=${emailSel}, password=${passwordSel}`);
      await page.click(emailSel);
      await page.type(emailSel, username, { delay: 70 });
      await new Promise((r) => setTimeout(r, 400));
      await page.click(passwordSel);
      await page.type(passwordSel, password, { delay: 70 });
      await new Promise((r) => setTimeout(r, 400));
      const submitSel = await findSelector(page, SUBMIT_SELECTORS);
      if (submitSel) await page.click(submitSel);
      else await page.keyboard.press("Enter");
      notifyStatus("Aguardando login...");
      await page.waitForNavigation({ timeout: 15000, waitUntil: "domcontentloaded" }).catch(() => {});
      loggedIn = true;
    } else if (emailSel) {
      notifyStatus("Login em 2 etapas: email...");
      console.log(`[login] Email-first: ${emailSel}`);
      await page.click(emailSel);
      await page.type(emailSel, username, { delay: 70 });
      const s1 = await findSelector(page, SUBMIT_SELECTORS);
      if (s1) await page.click(s1);
      else await page.keyboard.press("Enter");

      notifyStatus("Aguardando campo de senha...");
      await new Promise((r) => setTimeout(r, 3000));
      const pwdSel = await findSelector(page, PASSWORD_SELECTORS);
      if (pwdSel) {
        notifyStatus("Preenchendo senha...");
        await page.click(pwdSel);
        await page.type(pwdSel, password, { delay: 70 });
        const s2 = await findSelector(page, SUBMIT_SELECTORS);
        if (s2) await page.click(s2);
        else await page.keyboard.press("Enter");
        notifyStatus("Aguardando login...");
        await page.waitForNavigation({ timeout: 15000, waitUntil: "domcontentloaded" }).catch(() => {});
        loggedIn = true;
      }
    } else {
      console.log("[login] No form found");
      notifyStatus("Abrindo sem login automático...");
    }
  }

  if (loggedIn) {
    await new Promise((r) => setTimeout(r, 2000));
    const cookies = await page.cookies();
    if (cookies.length > 0) saveCookies(platform.id, cookies);
    notifyStatus("Login feito! Sessão guardada ✓");
  } else {
    await new Promise((r) => setTimeout(r, 1000));
    notifyStatus("Pronto!");
  }
}

async function startScreencast(session: Session, viewportW: number, viewportH: number) {
  const cdp = await session.page.createCDPSession();
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 85,
    maxWidth: viewportW,
    maxHeight: viewportH,
    everyNthFrame: 1,
  });
  cdp.on("Page.screencastFrame", async (frame) => {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: "frame", data: frame.data }));
      await cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
    }
  });
  session.ws.send(JSON.stringify({ type: "ready" }));
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests for /ws path only
  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "");
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket as never, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const { query } = parse(req.url || "", true);
    const platformId = query.platformId as string;
    const viewportW = parseInt((query.w as string) || "1280", 10);
    const viewportH = parseInt((query.h as string) || "900", 10);

    if (!platformId) {
      ws.send(JSON.stringify({ type: "error", message: "platformId obrigatório" }));
      ws.close();
      return;
    }

    const platform = await db.platform.findUnique({
      where: { id: platformId, isActive: true },
      include: { credential: { select: { username: true, password: true, loginUrl: true, loginConfig: true } } },
    });

    if (!platform) {
      ws.send(JSON.stringify({ type: "error", message: "Plataforma não encontrada" }));
      ws.close();
      return;
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    let browser: Browser;
    try {
      browser = await puppeteerExtra.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--disable-infobars",
          "--disable-extensions",
          "--disable-automation",
          "--exclude-switches=enable-automation",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          `--window-size=${viewportW},${viewportH}`,
          "--lang=pt-BR,pt",
        ],
        defaultViewport: { width: viewportW, height: viewportH },
      }) as unknown as Browser;
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Erro ao iniciar o navegador" }));
      ws.close();
      return;
    }

    const page = await browser.newPage();
    await page.setViewport({ width: viewportW, height: viewportH });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" });

    const session: Session = { browser, page, ws };
    sessions.set(ws, session);

    function notifyStatus(msg: string) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "status", message: msg }));
      console.log("[status]", msg);
    }

    try {
      await performLogin(page, platform, notifyStatus);
      await startScreencast(session, viewportW, viewportH);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[session error]", msg);
      ws.send(JSON.stringify({ type: "error", message: `Erro: ${msg}` }));
    }

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, x, y, key, code, deltaX, deltaY, button } = msg;
        if (type === "mousemove") await page.mouse.move(x, y);
        else if (type === "click") await page.mouse.click(x, y, { button: button === 2 ? "right" : "left" });
        else if (type === "dblclick") await page.mouse.click(x, y, { clickCount: 2 });
        else if (type === "keydown") {
          if (key.length === 1) await page.keyboard.type(key);
          else await page.keyboard.press(code || key);
        } else if (type === "scroll") await page.mouse.wheel({ deltaX: deltaX || 0, deltaY: deltaY || 0 });
        else if (type === "resize") await page.setViewport({ width: msg.w, height: msg.h });
        else if (type === "clear-session") clearCookies(platformId);
      } catch {}
    });

    ws.on("close", async () => {
      try {
        const cookies = await page.cookies();
        if (cookies.length > 0) saveCookies(platformId, cookies);
      } catch {}
      const s = sessions.get(ws);
      if (s) {
        await s.browser.close().catch(() => {});
        sessions.delete(ws);
      }
      console.log("[session] closed, active:", sessions.size);
    });
  });

  console.log("[ws] WebSocket server ready on /ws");
  return wss;
}

process.on("SIGINT", async () => {
  for (const [, s] of sessions) await s.browser.close().catch(() => {});
  await db.$disconnect();
  process.exit(0);
});
