import { createApp } from "../server/app.js";
let cachedApp = null;
async function handler(req, res) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
}
export {
  handler as default
};
