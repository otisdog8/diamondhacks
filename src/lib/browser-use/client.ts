// Browser Use Cloud API client — using the official SDK v3 export
// Docs: https://docs.browser-use.com
// Import from "browser-use-sdk/v3" for the v3 Sessions API

import {
  BrowserUse,
  type SessionResponse,
  type ProfileView,
  type SessionResult,
} from "browser-use-sdk/v3";

let _client: BrowserUse | null = null;

export function getClient(): BrowserUse {
  if (!_client) {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) throw new Error("BROWSER_USE_API_KEY environment variable is required");
    _client = new BrowserUse({ apiKey });
  }
  return _client;
}

// Re-export types the rest of the codebase needs
export type { SessionResponse, ProfileView, SessionResult };
export { BrowserUse };
