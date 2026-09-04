// capture.js — Renderiza el sobrevuelo frame a frame y guarda PNGs en ./frames
//
// Uso:  node capture.js [duracionSegundos] [fps]
// Ej.:  node capture.js 12 30    -> vídeo de 12s a 30fps (360 frames)
//
// Requiere: npm install puppeteer
// Requiere servir index.html por http (no file://), p.ej.:
//   npx http-server . -p 8080
// y luego ejecutar este script apuntando a esa URL.

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const DURATION_SECONDS = parseFloat(process.argv[2] || "12");
const FPS = parseInt(process.argv[3] || "30", 10);
const TOTAL_FRAMES = Math.round(DURATION_SECONDS * FPS);
const PAGE_URL = process.env.PAGE_URL || "http://localhost:8080/index.html";
const OUT_DIR = path.join(__dirname, "frames");
const VIEWPORT = { width: 1080, height: 1920 }; // vertical, formato reel

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  console.log(`Cargando ${PAGE_URL} ...`);
  await page.goto(PAGE_URL, { waitUntil: "networkidle0" });

  await page.waitForFunction("window.appReady === true", { timeout: 60000 });
  console.log("Escena lista. Capturando", TOTAL_FRAMES, "frames...");

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / (TOTAL_FRAMES - 1);
    await page.evaluate((t) => window.setCameraAtProgress(t), t);
    const filename = path.join(OUT_DIR, `frame_${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: filename });
    if (i % 10 === 0) console.log(`  frame ${i}/${TOTAL_FRAMES}`);
  }

  await browser.close();
  console.log("Listo. Frames en", OUT_DIR);
  console.log("Ahora ejecuta ./render.sh para generar el vídeo final.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
