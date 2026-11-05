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
    } else if (file.endsWith(".ts") && !file.endsWith(".service.ts") && !file.endsWith(".controller.ts") && !file.endsWith(".spec.ts")) {
      results.push(file);
    }
  });
  return results;
}

const entityFiles = walk("./backend/src/Database/Table");
const tables = [];

entityFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const entityMatch = content.match(/@Entity\s*\(\s*["']([^"']+)["']/);
  const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  if (entityMatch || classMatch) {
    const tableName = entityMatch ? entityMatch[1] : (classMatch ? classMatch[1] : path.basename(file));
    const hasTenant = /tenant_id|tenantId/i.test(content) || /BaseTable/.test(content);
    tables.push({
      file: path.relative(".", file),
      tableName,
      className: classMatch ? classMatch[1] : "",
      hasTenant
    });
  }
});

console.log(JSON.stringify(tables, null, 2));

