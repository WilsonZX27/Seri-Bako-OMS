export type JsonResponseMessages = {
  sessionExpired?: string;
  unexpectedResponse?: string;
  invalidJson?: string;
};

export async function readJsonResponse<T>(response: Response, messages: JsonResponseMessages = {}): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (response.status === 401 || response.redirected || response.url.includes("/login")) {
    throw new Error(messages.sessionExpired ?? "Your session expired. Sign in again, then retry; your work remains on this page.");
  }
  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    throw new Error(messages.unexpectedResponse ?? `The service returned an unexpected response (${response.status}). Retry; no changes were applied.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(messages.invalidJson ?? "The service response could not be read. Retry; no changes were applied.");
  }
}
