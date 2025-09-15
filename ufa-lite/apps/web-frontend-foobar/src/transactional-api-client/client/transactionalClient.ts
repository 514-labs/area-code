import { getTransactionApiBase } from "@/env-vars";
import { supabase } from "@/auth/supabase";

async function getAuthHeader(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : undefined;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getTransactionApiBase();
  const headers = new Headers(init?.headers || {});
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  const auth = await getAuthHeader();
  if (auth) headers.set("authorization", auth);
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

// Foo client
export const FooApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    apiFetch<{ items: any[]; limit: number; offset: number }>(
      `/api/foo?limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`
    ),
  get: (id: string) => apiFetch<any>(`/api/foo/${id}`),
  create: (body: any) => apiFetch<any>(`/api/foo`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch<any>(`/api/foo/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<{ ok: true }>(`/api/foo/${id}`, { method: "DELETE" }),
};

// Bar client
export const BarApi = {
  list: (params?: { fooId?: string; limit?: number; offset?: number }) => {
    const qp = new URLSearchParams();
    if (params?.fooId) qp.set("fooId", params.fooId);
    qp.set("limit", String(params?.limit ?? 50));
    qp.set("offset", String(params?.offset ?? 0));
    return apiFetch<{ items: any[]; limit: number; offset: number }>(`/api/bar?${qp.toString()}`);
  },
  get: (id: string) => apiFetch<any>(`/api/bar/${id}`),
  create: (body: any) => apiFetch<any>(`/api/bar`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch<any>(`/api/bar/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<{ ok: true }>(`/api/bar/${id}`, { method: "DELETE" }),
};


