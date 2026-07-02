import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns successful external responses", async () => {
    const response = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(fetchWithTimeout("https://example.test")).resolves.toBe(response);
  });

  it("maps timeouts to a 504 error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    await expect(fetchWithTimeout("https://example.test")).rejects.toMatchObject({
      status: 504,
      code: "EXTERNAL_SERVICE_TIMEOUT"
    });
  });

  it("maps network failures to a 502 error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(fetchWithTimeout("https://example.test")).rejects.toMatchObject({
      status: 502,
      code: "EXTERNAL_SERVICE_UNREACHABLE"
    });
  });
});
