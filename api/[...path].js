import handleRequest from "../server.js";

export default function handler(req, res) {
  const url = req.url || "/";
  if (!url.startsWith("/api/") && url !== "/api") {
    const path = url.startsWith("/") ? url : `/${url}`;
    req.url = `/api${path}`;
  }
  return handleRequest(req, res);
}
