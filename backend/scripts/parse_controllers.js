const fs = require("fs");
const path = require("path");

function walk(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
}

const controllers = walk("./backend/src", ".controller.ts").filter(f => !f.endsWith("Base.controller.ts"));

const apiEndpoints = [];

controllers.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(".", file);
  const controllerName = path.basename(file);

  // Extract controller path(s)
  let paths = [""];
  const objMatch = content.match(/@Controller\s*\(\s*\{[^}]*path\s*:\s*(\[[^\]]*\]|["'][^"']*["'])/s);
  const strMatch = content.match(/@Controller\s*\(\s*["']([^"']*)["']\s*\)/);
  
  if (objMatch) {
    const raw = objMatch[1].trim();
    if (raw.startsWith("[")) {
      try {
        paths = eval(raw);
      } catch (e) {
        paths = [raw.replace(/[\[\]"']/g, "")];
      }
    } else {
      paths = [raw.replace(/["']/g, "")];
    }
  } else if (strMatch) {
    paths = [strMatch[1]];
  }

  // Method handlers
  const regex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:["']([^"']*)["'])?\s*\)[\s\S]*?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const verb = m[1].toUpperCase();
    const subRoute = m[2] !== undefined ? m[2] : "";
    const method = m[3];
    
    paths.forEach(p => {
      let r = "/api/v1/" + p + "/" + subRoute;
      r = r.replace(/\/+/g, "/").replace(/\/$/, "");
      apiEndpoints.push({
        controller: controllerName,
        file: relPath,
        verb,
        path: r,
        handler: method
      });
    });
  }
});

fs.writeFileSync("backend/scripts/all_api_endpoints.json", JSON.stringify(apiEndpoints, null, 2), "utf8");
console.log(`Extracted ${apiEndpoints.length} endpoints from ${controllers.length} controllers.`);

