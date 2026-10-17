import { chromium } from "playwright";
const out = process.env.SHOT_DIR ?? "screenshots";
import fs from "node:fs"; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/01-form.png`, fullPage: true });
for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "Дальше" }).click(); await page.waitForTimeout(150); }
await page.screenshot({ path: `${out}/02-summary.png`, fullPage: true });
await page.getByRole("button", { name: /Собрать рацион/ }).click();
await page.waitForSelector("text=Список покупок", { timeout: 60000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/03-week.png`, fullPage: true });
await page.getByRole("button", { name: "Список покупок" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/04-shop.png`, fullPage: true });
await page.getByRole("button", { name: "Нормы" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/05-norms.png`, fullPage: true });
// dark + mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
await m.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await m.screenshot({ path: `${out}/06-mobile-dark.png`, fullPage: true });
console.log("errors:", errors);
await browser.close();
