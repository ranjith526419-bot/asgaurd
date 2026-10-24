const vault = /* @__PURE__ */ new Map();
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of vault.entries()) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      vault.delete(id);
    }
  }
}, 3e3);
cleanupTimer.unref();
function getActiveSecretCount() {
  return vault.size;
}
export {
  getActiveSecretCount,
  vault
};
