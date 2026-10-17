// Скриншоты приложения: npx vite preview --port 4173, затем node scripts/screenshot.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const out = process.env.SHOT_DIR ?? "screenshots";
const base = process.env.SHOT_URL ?? "http://localhost:4173/";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const errors = [];
async function flow(page, tag) {
  page.on("pageerror", (e) => errors.push(`${tag}: ${e}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${tag}: ${m.text()}`); });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/${tag}-01-form.png`, fullPage: true });
  for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "Дальше" }).click(); await page.waitForTimeout(120); }
  await page.getByRole("button", { name: /Собрать рацион/ }).click();
  await page.waitForSelector("text=Рацион на неделю", { timeout: 120000 });
  await page.waitForTimeout(400);
  const w = async () => page.evaluate(() => `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`);
  console.log(tag, "week width", await w());
  await page.screenshot({ path: `${out}/${tag}-02-week.png`, fullPage: true });
  await page.getByRole("button", { name: "Покупки" }).click(); await page.waitForTimeout(300);
  console.log(tag, "shop width", await w());
  await page.screenshot({ path: `${out}/${tag}-03-shop.png`, fullPage: true });
  await page.getByRole("button", { name: "Нормы" }).click(); await page.waitForTimeout(300);
  console.log(tag, "norms width", await w());
  await page.screenshot({ path: `${out}/${tag}-04-norms.png`, fullPage: true });
}
await flow(await browser.newPage({ viewport: { width: 1280, height: 900 } }), "desktop");
await flow(await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }), "mobile");
const dark = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
await dark.goto(base, { waitUntil: "networkidle" });
await dark.screenshot({ path: `${out}/mobile-dark-form.png`, fullPage: true });
console.log("errors:", errors);
await browser.close();
