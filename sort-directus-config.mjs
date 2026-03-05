import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const collectionsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "directus-config",
  "collections",
);

for (const file of readdirSync(collectionsDir).filter((f) => f.endsWith(".json"))) {
  const path = join(collectionsDir, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  data.sort((a, b) => a._syncId.localeCompare(b._syncId));
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

console.log("Sorted directus-config/collections/*.json by _syncId");
