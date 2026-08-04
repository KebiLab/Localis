import type { FetchImplementation } from "./ollama.js";

export interface LMStudioModel {
  name: string;
  ownedBy?: string;
}

export interface LMStudioGenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  format?: "json" | Record<string, unknown>;
  temperature?: number;
  endpoint?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export interface LMStudioGenerateResult {
  model: string;
  response: string;
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
}

export class LMStudioError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_ENDPOINT"
      | "UNREACHABLE"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "LMStudioError";
  }
}

function localEndpoint(endpoint = "http://127.0.0.1:1234"): URL {
  const url = new URL(endpoint);
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new LMStudioError(
      "The LM Studio endpoint must use HTTP on localhost, 127.0.0.1, or ::1.",
      "INVALID_ENDPOINT",
    );
  }
  return url;
}

function endpointUrl(endpoint: string | undefined, pathname: string): URL {
  const base = localEndpoint(endpoint);
  const prefix = base.pathname.replace(/\/$/, "");
  base.pathname = `${prefix}${pathname}`;
  base.search = "";
  base.hash = "";
  return base;
}

async function request(
  url: URL,
  init: RequestInit,
  fetchImplementation: FetchImplementation,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetchImplementation(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LMStudioError(`LM Studio is unreachable: ${message}`, "UNREACHABLE");
  }
}

export async function listLMStudioModels(options: {
  endpoint?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
} = {}): Promise<LMStudioModel[]> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await request(
    endpointUrl(options.endpoint, "/v1/models"),
    { method: "GET" },
    fetchImplementation,
    options.timeoutMs ?? 2_500,
  );
  if (!response.ok) {
    throw new LMStudioError(`LM Studio returned HTTP ${response.status}.`, "HTTP_ERROR");
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: unknown; owned_by?: unknown }>;
  };
  if (!Array.isArray(data.data)) {
    throw new LMStudioError("LM Studio returned an invalid model list.", "INVALID_RESPONSE");
  }
  return data.data.flatMap((model) =>
    typeof model.id === "string"
      ? [{ name: model.id, ...(typeof model.owned_by === "string" ? { ownedBy: model.owned_by } : {}) }]
      : [],
  );
}

export async function generateWithLMStudio(
  options: LMStudioGenerateOptions,
): Promise<LMStudioGenerateResult> {
  if (!options.model.trim()) {
    throw new LMStudioError("An LM Studio model name is required.", "INVALID_RESPONSE");
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const startedAt = performance.now();
  const response = await request(
    endpointUrl(options.endpoint, "/v1/chat/completions"),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: [
          ...(options.system ? [{ role: "system", content: options.system }] : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature ?? 0,
        stream: false,
        ...(options.format
          ? {
              response_format:
                options.format === "json"
                  ? { type: "json_object" }
                  : {
                      type: "json_schema",
                      json_schema: { name: "localis_response", strict: true, schema: options.format },
                    },
            }
          : {}),
      }),
    },
    fetchImplementation,
    options.timeoutMs ?? 120_000,
  );
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new LMStudioError(
      `LM Studio returned HTTP ${response.status}${body ? `: ${body}` : "."}`,
      "HTTP_ERROR",
    );
  }

  const data = (await response.json()) as {
    model?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new LMStudioError("LM Studio returned an invalid generation response.", "INVALID_RESPONSE");
  }
  return {
    model: typeof data.model === "string" ? data.model : options.model,
    response: content,
    ...(typeof data.usage?.prompt_tokens === "number" ? { promptTokens: data.usage.prompt_tokens } : {}),
    ...(typeof data.usage?.completion_tokens === "number" ? { responseTokens: data.usage.completion_tokens } : {}),
    durationMs: Math.round(performance.now() - startedAt),
  };
}
