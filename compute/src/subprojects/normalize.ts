/** Strip leading ./, collapse duplicate slashes, trim. Returns empty string if invalid. */
export function normalizePath(path: string): string {
  let p = path.trim();
  if (!p) return "";

  while (p.startsWith("./")) {
    p = p.slice(2);
  }

  p = p.replace(/\/+/g, "/");
  if (p.startsWith("/")) {
    p = p.slice(1);
  }
  if (p.endsWith("/")) {
    p = p.slice(0, -1);
  }

  return p;
}
