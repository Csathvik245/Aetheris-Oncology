import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on("console", (m) => console.log("[console]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto("http://localhost:3000/cases/842/worksheet", { waitUntil: "networkidle" });

async function activeStepLabel() {
  return page.locator("text=Treatment Planning, text=Toxicity Planning, text=Final Review").first();
}

async function readHeading() {
  return page.locator("div.grid.grid-cols-3 h3").first().innerText();
}

console.log("initial heading:", await readHeading());

const nextBtn = page.getByRole("button", { name: "Next", exact: true });

// step 2 -> 3
await nextBtn.click();
await page.waitForTimeout(200);
console.log("after 1 click from Treatment Planning:", await readHeading());

// step 3 -> 4 : the reported problem transition
await nextBtn.click();
await page.waitForTimeout(200);
console.log("after 1 click from Toxicity Planning:", await readHeading());

const stillToxicity = (await readHeading()) === "Toxicity Planning";
if (stillToxicity) {
  console.log("BUG CONFIRMED: needed a second click");
  await nextBtn.click();
  await page.waitForTimeout(200);
  console.log("after 2nd click:", await readHeading());
} else {
  console.log("No bug reproduced on first click");
}

await browser.close();
