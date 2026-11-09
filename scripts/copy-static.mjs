import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const file of ["index.html", "app.js", "styles.css"]) {
  cpSync(file, `dist/${file}`);
}
cpSync("admin", "dist/admin", { recursive: true });
cpSync("assets", "dist/assets", { recursive: true });
