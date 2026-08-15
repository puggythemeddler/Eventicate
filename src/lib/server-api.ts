import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function serverApi<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cookieStore = await cookies();
  const headers = new Headers(options.headers);
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}
