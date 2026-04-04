// Browser Use Cloud API client
// The npm SDK package is missing dist files, so we use the REST API directly
// API docs: https://docs.browser-use.com

const BASE_URL = "https://api.browser-use.com/v3";

function getApiKey(): string {
  const key = process.env.BROWSER_USE_API_KEY;
  if (!key) throw new Error("BROWSER_USE_API_KEY environment variable is required");
  return key;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Browser Use API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// Profile types
interface BUProfile {
  id: string;
  name: string;
}

// Session types
interface BUSession {
  id: string;
  live_url: string;
  status: string;
}

// Task/Run types
interface BURunResult {
  id: string;
  status: string;
  output?: string;
  error?: string;
}

export const browserUseApi = {
  // Profiles
  profiles: {
    async create(name: string): Promise<BUProfile> {
      return apiRequest<BUProfile>("/profiles", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    async get(id: string): Promise<BUProfile> {
      return apiRequest<BUProfile>(`/profiles/${id}`);
    },

    async list(): Promise<BUProfile[]> {
      return apiRequest<BUProfile[]>("/profiles");
    },
  },

  // Sessions
  sessions: {
    async create(options?: { profileId?: string }): Promise<BUSession> {
      return apiRequest<BUSession>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          profile_id: options?.profileId,
        }),
      });
    },

    async get(id: string): Promise<BUSession> {
      return apiRequest<BUSession>(`/sessions/${id}`);
    },

    async stop(id: string): Promise<void> {
      await apiRequest(`/sessions/${id}/stop`, { method: "POST" });
    },
  },

  // Run tasks
  async run(
    task: string,
    options?: {
      sessionId?: string;
      model?: string;
    }
  ): Promise<BURunResult> {
    return apiRequest<BURunResult>("/run", {
      method: "POST",
      body: JSON.stringify({
        task,
        session_id: options?.sessionId,
        model: options?.model,
      }),
    });
  },

  // Poll a run until completed
  async waitForRun(runId: string, timeoutMs = 300000): Promise<BURunResult> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await apiRequest<BURunResult>(`/runs/${runId}`);
      if (result.status === "completed" || result.status === "failed") {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("Run timed out");
  },
};
