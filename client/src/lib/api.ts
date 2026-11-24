export const apiBaseUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  `${window.location.protocol}//${window.location.hostname}:4000`;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiResult<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<{ data: T; total?: number; page?: number; pageSize?: number }> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Could not connect to the API at ${apiBaseUrl}. Start the server and verify VITE_API_URL.`,
      0,
    );
  }
  if (response.status === 204) return { data: undefined as T };
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    total?: number;
    page?: number;
    pageSize?: number;
    error?: string;
    details?: unknown;
  };
  if (!response.ok)
    throw new ApiError(
      body.error || `Request failed (${response.status}).`,
      response.status,
      body.details,
    );
  return {
    data: ("data" in body ? body.data : body) as T,
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await apiResult<T>(path, options, token);
  return response.data;
}

export function publicAssetSettings() {
  return {
    url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "",
    api: apiBaseUrl,
  };
}
