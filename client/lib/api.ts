/**
 * Base URL for the Express API.
 *
 * During development, Next.js rewrites `/api/*` to the Express server, so
 * we can call `/api/...` directly.  In production, set NEXT_PUBLIC_API_URL
 * to the deployed server URL.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Typed fetch wrapper for the API.
 *
 * @example
 * const health = await apiFetch<HealthStatus>('/api/health');
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (error as { message?: string }).message ?? 'API request failed',
    );
  }

  return res.json() as Promise<T>;
}
