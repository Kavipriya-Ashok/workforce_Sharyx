const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".controller.ts") && !file.endsWith("Base.controller.ts")) {
      results.push(file);
    }
  });
  return results;
}

const controllers = walk("./backend/src");
const allEndpoints = [];

controllers.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  // Match @Controller('path') or @Controller({ path: 'path', ... })
  let prefix = "";
  const objMatch = content.match(/@Controller\s*\(\s*\{[^}]*path\s*:\s*["']([^"']*)["']/);
  const strMatch = content.match(/@Controller\s*\(\s*["']([^"']*)["']\s*\)/);
  if (objMatch) {
    prefix = objMatch[1];
  } else if (strMatch) {
    prefix = strMatch[1];
  }
  
  const relPath = path.relative(".", file);
  
  // match method decorators
  const regex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:["']([^"']*)["'])?\s*\)[\s\S]*?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const verb = m[1].toUpperCase();
    const route = m[2] !== undefined ? m[2] : "";
    const method = m[3];
    let fullRoute = "/api/v1";
    if (prefix) fullRoute += "/" + prefix;
    if (route) fullRoute += "/" + route;
    fullRoute = fullRoute.replace(/\/+/g, "/").replace(/\/$/, "");
    allEndpoints.push({
      controller: path.basename(file),
      file: relPath,
      verb,
      route: fullRoute,
      handler: method
    });
  }
});

// Group by controller
const byController = {};
allEndpoints.forEach(ep => {
  if (!byController[ep.controller]) byController[ep.controller] = [];
  byController[ep.controller].push(ep);
});

console.log(JSON.stringify(byController, null, 2));
