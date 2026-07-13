export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request to ${path} failed`);
  return json;
}
