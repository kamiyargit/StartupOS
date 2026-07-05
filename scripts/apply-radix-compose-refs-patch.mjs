/**
 * React 19 + Radix: unstable useComposedRefs identities cause infinite loops in Select.
 * Apply the compose-refs fix to every copy under node_modules (including Docker volumes).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nodeModules = join(root, "node_modules");

const OLD = `function useComposedRefs(...refs) {
  return React.useCallback(composeRefs(...refs), refs);
}`;

const NEW = `function useComposedRefs(...refs) {
  const refsRef = React.useRef(refs);
  refsRef.current = refs;
  return React.useCallback((node) => composeRefs(...refsRef.current)(node), []);
}`;

function findComposeRefsFiles(dir) {
  const files = [];

  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        (entry.name === "index.mjs" || entry.name === "index.js") &&
        fullPath.replace(/\\/g, "/").includes("@radix-ui/react-compose-refs/dist/")
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

let patched = 0;
let skipped = 0;

for (const file of findComposeRefsFiles(nodeModules)) {
  const content = readFileSync(file, "utf8");
  if (content.includes("refsRef.current = refs")) {
    skipped++;
    continue;
  }
  if (!content.includes(OLD)) {
    continue;
  }
  writeFileSync(file, content.replace(OLD, NEW), "utf8");
  patched++;
}

if (patched > 0) {
  console.log(`[radix-patch] Patched ${patched} @radix-ui/react-compose-refs file(s).`);
} else if (skipped > 0) {
  console.log(`[radix-patch] Already patched (${skipped} file(s)).`);
}
