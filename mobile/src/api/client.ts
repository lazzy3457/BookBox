const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const apiBaseUrl = API_URL ?? "Non configuree";
const REQUEST_TIMEOUT_MS = 12000;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: controller.signal
  }).catch((error) => {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Le serveur BookBox ne repond pas. Verifie l'adresse API dans les parametres.", 408, "REQUEST_TIMEOUT");
    }

    throw error;
  }).finally(() => clearTimeout(timeout));
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
