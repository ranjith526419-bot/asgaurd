import fs from "fs";
import path from "path";
const vault = /* @__PURE__ */ new Map();
const TMP_DIR = path.resolve("/tmp", "ephemeral-vault");
let isFileStoreAvailable = false;
try {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  isFileStoreAvailable = true;
} catch {
  isFileStoreAvailable = false;
}
function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return { url: url.replace(/\/+$/, ""), token };
  }
  return null;
}
function getStorageBackendName() {
  if (getRedisConfig()) return "Vercel KV / Upstash Redis (Serverless Persistent)";
  if (isFileStoreAvailable) return "Temporary Disk Storage (/tmp/ephemeral-vault)";
  return "In-Memory Vault (Single Process)";
}
async function executeRedisCommand(command) {
  const config = getRedisConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn("[Vault Storage] Redis REST operation error:", err);
    return null;
  }
}
function readEntryFromFile(id) {
  if (!isFileStoreAvailable) return null;
  const filePath = path.join(TMP_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const entry = JSON.parse(content);
      if (entry.expires_at <= Date.now() || entry.views_remaining <= 0) {
        fs.unlinkSync(filePath);
        return null;
      }
      return entry;
    }
  } catch {
  }
  return null;
}
function writeEntryToFile(entry) {
  if (!isFileStoreAvailable) return;
  const filePath = path.join(TMP_DIR, `${entry.id}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
  } catch {
  }
}
function deleteEntryFromFile(id) {
  if (!isFileStoreAvailable) return;
  const filePath = path.join(TMP_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
  }
}
async function saveVaultEntry(entry) {
  vault.set(entry.id, entry);
  writeEntryToFile(entry);
  const redis = getRedisConfig();
  if (redis) {
    const ttlSeconds = Math.max(1, Math.ceil((entry.expires_at - Date.now()) / 1e3));
    const serialized = JSON.stringify(entry);
    await executeRedisCommand(["SET", `vault:${entry.id}`, serialized, "EX", String(ttlSeconds)]);
  }
}
async function getVaultEntry(id) {
  const now = Date.now();
  let entry = vault.get(id);
  if (entry) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      await deleteVaultEntry(id);
      return null;
    }
    return entry;
  }
  entry = readEntryFromFile(id);
  if (entry) {
    vault.set(id, entry);
    return entry;
  }
  const redis = getRedisConfig();
  if (redis) {
    const result = await executeRedisCommand(["GET", `vault:${id}`]);
    if (result && typeof result === "string") {
      try {
        const parsed = JSON.parse(result);
        if (parsed.expires_at > now && parsed.views_remaining > 0) {
          vault.set(id, parsed);
          writeEntryToFile(parsed);
          return parsed;
        } else {
          await deleteVaultEntry(id);
          return null;
        }
      } catch {
      }
    }
  }
  return null;
}
async function hasVaultEntry(id) {
  const entry = await getVaultEntry(id);
  return entry !== null;
}
async function deleteVaultEntry(id) {
  vault.delete(id);
  deleteEntryFromFile(id);
  const redis = getRedisConfig();
  if (redis) {
    await executeRedisCommand(["DEL", `vault:${id}`]);
  }
  return true;
}
async function burnVaultEntry(id) {
  const entry = await getVaultEntry(id);
  if (!entry) {
    return { entry: null, burned: true };
  }
  entry.views_remaining -= 1;
  const burned = entry.views_remaining <= 0;
  if (burned) {
    await deleteVaultEntry(id);
  } else {
    await saveVaultEntry(entry);
  }
  return { entry, burned };
}
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of vault.entries()) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      deleteVaultEntry(id).catch(() => null);
    }
  }
  if (isFileStoreAvailable) {
    try {
      const files = fs.readdirSync(TMP_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(TMP_DIR, file);
          try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (parsed.expires_at <= now || parsed.views_remaining <= 0) {
              fs.unlinkSync(filePath);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
}, 3e3);
cleanupTimer.unref();
function getActiveSecretCount() {
  return vault.size;
}
export {
  burnVaultEntry,
  deleteVaultEntry,
  getActiveSecretCount,
  getStorageBackendName,
  getVaultEntry,
  hasVaultEntry,
  saveVaultEntry,
  vault
};
