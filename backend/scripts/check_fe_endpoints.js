const fs = require('fs');
const path = require('path');

function checkServices() {
  const dir = './frontend/src/service';
  fs.readdirSync(dir).forEach(f => {
    const c = fs.readFileSync(path.join(dir, f), 'utf8');
    const matches = [...c.matchAll(/(?:axios|api|client)\.(get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)];
    console.log('\n=== ' + f + ' ===');
    const seen = new Set();
    matches.forEach(m => {
      const ep = m[1].toUpperCase() + ' ' + m[2];
      if (!seen.has(ep)) {
        seen.add(ep);
        console.log('  ' + ep);
      }
    });
  });

  // Also check auth and context
  ['./frontend/src/lib/auth.tsx', './frontend/src/context/TenantContext.tsx'].forEach(f => {
    if (fs.existsSync(f)) {
      const c = fs.readFileSync(f, 'utf8');
      const matches = [...c.matchAll(/(?:axios|api|client)\.(get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)];
      console.log('\n=== ' + f + ' ===');
      const seen = new Set();
      matches.forEach(m => {
        const ep = m[1].toUpperCase() + ' ' + m[2];
        if (!seen.has(ep)) {
          seen.add(ep);
          console.log('  ' + ep);
        }
      });
    }
  });
}

checkServices();

