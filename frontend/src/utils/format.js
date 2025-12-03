// src/utils/format.js
export function shortId(id, len = 5) {
  if (!id) return "—";
  const s = String(id);
  return s.length <= len ? s : s.slice(0, len);
}
