import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const copyItems = [
  "admin",
  "clients",
  "data",
  "FEISHU_DYNAMIC_SETUP.md",
  "index.html",
  "vercel.json"
];

for (const item of copyItems) {
  await cp(join(root, item), join(dist, item), { recursive: true });
}

await cp(join(root, "feishu-dashboard.html"), join(dist, "admin", "feishu-dashboard.html"));

const headers = [
  "/*",
  "  X-Frame-Options: DENY",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  ""
];

if (process.env.ADMIN_BASIC_AUTH) {
  headers.push("/admin/*", `  Basic-Auth: ${process.env.ADMIN_BASIC_AUTH}`, "");
}

if (process.env.GUORAN_BASIC_AUTH) {
  headers.push("/clients/guoran/*", `  Basic-Auth: ${process.env.GUORAN_BASIC_AUTH}`, "");
}

if (process.env.ZIKANG_BASIC_AUTH) {
  headers.push("/clients/zhang-zikang/*", `  Basic-Auth: ${process.env.ZIKANG_BASIC_AUTH}`, "");
}

await writeFile(join(dist, "_headers"), headers.join("\n"));

const redirects = [
  "/coach-dashboard.html /admin/ 301",
  "/feishu-dashboard.html /admin/feishu-dashboard.html 301",
  "/guoran-summer-camp-launch-page.html /clients/guoran/ 301",
  "/guoran-30-day-roadmap.html /clients/guoran/roadmap.html 301",
  "/zhang-zikang-delivery.html /clients/zhang-zikang/ 301"
];

await writeFile(join(dist, "_redirects"), redirects.join("\n"));
