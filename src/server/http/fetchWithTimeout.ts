type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export async function fetchWithTimeout(input: FetchInput, init: FetchInit = {}, timeoutMs = 8_000) {
  try {
    return await fetch(input, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw Object.assign(new Error("Le service externe a mis trop de temps à répondre."), {
        status: 504,
        code: "EXTERNAL_SERVICE_TIMEOUT"
      });
    }
    throw Object.assign(new Error("Le service externe est momentanément inaccessible."), {
      status: 502,
      code: "EXTERNAL_SERVICE_UNREACHABLE"
    });
  }
}
