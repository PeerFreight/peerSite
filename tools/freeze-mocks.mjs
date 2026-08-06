#!/usr/bin/env node
/**
 * Freeze the /mock-lab product mocks into the PNGs the marketing pages embed.
 *
 *   node tools/freeze-mocks.mjs        (dev server must be running on :3000)
 *
 * For each mock frame on /mock-lab this measures the card's exact bounds and
 * captures it at 2x with a transparent background (round corners survive),
 * writing public/site/mock-<id>@2x.png. Rerun whenever the portal design
 * (and therefore the lab JSX) changes.
 *
 * No dependencies: drives headless Chrome over the DevTools protocol with
 * Node's built-in WebSocket (Node >= 22).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LAB_URL = process.env.LAB_URL ?? "http://localhost:3000/mock-lab";
const OUT_DIR = new URL("../public/site/", import.meta.url).pathname;
const MOCKS = ["loads", "quote", "track", "comps", "vetting", "updates", "close", "freight", "carrier"];

const profile = mkdtempSync(join(tmpdir(), "freeze-mocks-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--hide-scrollbars",
  "--window-size=800,1600",
  "about:blank",
]);

function cleanup() {
  chrome.kill();
  rmSync(profile, { recursive: true, force: true });
}
process.on("exit", cleanup);

const wsUrl = await new Promise((resolve, reject) => {
  let err = "";
  chrome.stderr.on("data", (chunk) => {
    err += chunk;
    const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  chrome.on("exit", () => reject(new Error(`Chrome exited before DevTools was ready:\n${err}`)));
  setTimeout(() => reject(new Error("Timed out waiting for Chrome DevTools")), 15000);
});

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error("Could not connect to Chrome DevTools"));
});

let nextId = 1;
const pending = new Map();
const eventWaiters = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.data ?? ""})`));
    else resolve(msg.result);
  } else if (msg.method) {
    for (let i = eventWaiters.length - 1; i >= 0; i--) {
      if (eventWaiters[i].method === msg.method) {
        eventWaiters[i].resolve(msg.params);
        eventWaiters.splice(i, 1);
      }
    }
  }
};

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const waitFor = (method) => new Promise((resolve) => eventWaiters.push({ method, resolve }));

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
// Transparent canvas so the captured cards keep their rounded corners.
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);

const loaded = waitFor("Page.loadEventFired");
await send("Page.navigate", { url: LAB_URL }, sessionId);
await loaded;

// Fonts and the logo img must be in before pixels are trustworthy.
await send(
  "Runtime.evaluate",
  {
    expression: `Promise.all([
      document.fonts.ready,
      ...Array.from(document.images).map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
      ),
    ]).then(() => {
      // The Next dev-tools indicator is position:fixed and would be baked
      // into whichever mock happens to sit under it.
      document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
      return true;
    })`,
    awaitPromise: true,
  },
  sessionId,
);

for (const id of MOCKS) {
  const { result } = await send(
    "Runtime.evaluate",
    {
      expression: `JSON.stringify(document.querySelector('#${id} > *').getBoundingClientRect())`,
      returnByValue: true,
    },
    sessionId,
  );
  const rect = JSON.parse(result.value);
  if (!rect.width || !rect.height) throw new Error(`Mock #${id} has no size — is the lab route rendering?`);
  const { data } = await send(
    "Page.captureScreenshot",
    {
      format: "png",
      captureBeyondViewport: true,
      clip: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scale: 2,
      },
    },
    sessionId,
  );
  const out = join(OUT_DIR, `mock-${id}@2x.png`);
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`mock-${id}@2x.png  ${Math.round(rect.width)}x${Math.round(rect.height)} css px (@2x)`);
}

ws.close();
cleanup();
process.exit(0);
