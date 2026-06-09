const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const apiBaseUrl = API_URL ?? "Non configuree";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function apiUrl(path: string) {
  if (!API_URL) {
    throw new ApiError("EXPO_PUBLIC_API_URL n'est pas configure.", 500, "API_URL_MISSING");
  }

  return `${API_URL}${path}`;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const url = apiUrl(path);

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Une erreur est survenue.",
      response.status,
      payload?.error?.code
    );
  }

  return payload as T;
}
