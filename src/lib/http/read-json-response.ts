export type JsonResponseMessages = {
  sessionExpired?: string;
  unexpectedResponse?: string;
  invalidJson?: string;
};

import { isSignInResponse } from "./session-result.ts";

import { dispatchSessionExpired } from "./session-recovery.ts";

export async function readJsonResponse<T>(response: Response, messages: JsonResponseMessages = {}): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (response.status === 401 || (response.redirected && isSignInResponse(response.url))) {
    dispatchSessionExpired(typeof window === "undefined" ? null : window.location.pathname);
    throw new Error(messages.sessionExpired ?? "Your session expired. Sign in again, then check the record before submitting again.");
  }
  if (response.redirected || (!contentType.includes("application/json") && !contentType.includes("+json"))) {
    throw new Error(messages.unexpectedResponse ?? `The service returned an unexpected response (${response.status}). The result is unconfirmed. Keep your inputs and check the record before trying again.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(messages.invalidJson ?? "The service response could not be read. The result is unconfirmed. Keep your inputs and check the record before trying again.");
  }
}
