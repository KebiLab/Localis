import type { FetchImplementation } from "./ollama.js";

export interface OpenAICompatibleModel {
  name: string;
  ownedBy?: string;
  createdAt?: number;
}

export interface OpenAICompatibleOptions {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export interface OpenAICompatibleGenerateOptions extends OpenAICompatibleOptions {
  model: string;
  prompt: string;
  system?: string;
  format?: "json" | Record<string, unknown>;
  temperature?: number;
}

export interface OpenAICompatibleGenerateResult {
  model: string;
  response: string;
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
}

export class OpenAICompatibleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_ENDPOINT"
      | "MISSING_API_KEY"
      | "UNREACHABLE"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "OpenAICompatibleError";
  }
}

function providerEndpoint(endpoint: string | undefined): URL {
  if (!endpoint?.trim()) {
    throw new OpenAICompatibleError("An API base URL is required.", "INVALID_ENDPOINT");
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new OpenAICompatibleError("The API base URL is invalid.", "INVALID_ENDPOINT");
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLoopback = localHosts.has(url.hostname);
  if ((isLoopback && url.protocol !== "http:" && url.protocol !== "https:") ||
      (!isLoopback && url.protocol !== "https:") || url.username || url.password || url.hash) {
    throw new OpenAICompatibleError(
      "Remote API endpoints must use HTTPS and cannot contain credentials or fragments.",
      "INVALID_ENDPOINT",
    );
  }
  return url;
}

function endpointUrl(endpoint: string | undefined, pathname: string): URL {
  const base = providerEndpoint(endpoint);
  const prefix = base.pathname.replace(/\/$/, "");
  base.pathname = `${prefix}${pathname}`;
  base.search = "";
  base.hash = "";
  return base;
}

function requestHeaders(apiKey: string | undefined): Record<string, string> {
  const key = apiKey?.trim();
  return {
    accept: "application/json",
    ...(key ? { authorization: `Bearer ${key}` } : {}),
  };
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
    throw new OpenAICompatibleError(`The provider is unreachable: ${message}`, "UNREACHABLE");
  }
}

export async function listOpenAICompatibleModels(
  options: OpenAICompatibleOptions,
): Promise<OpenAICompatibleModel[]> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await request(
    endpointUrl(options.endpoint, "/models"),
    { method: "GET", headers: requestHeaders(options.apiKey) },
    fetchImplementation,
    options.timeoutMs ?? 10_000,
  );
  if (!response.ok) {
    throw new OpenAICompatibleError(`The provider returned HTTP ${response.status}.`, "HTTP_ERROR");
  }
  const data = (await response.json()) as {
    data?: Array<{ id?: unknown; owned_by?: unknown; created?: unknown }>;
  };
  if (!Array.isArray(data.data)) {
    throw new OpenAICompatibleError("The provider returned an invalid model list.", "INVALID_RESPONSE");
  }
  return data.data.flatMap((model) =>
    typeof model.id === "string"
      ? [{
          name: model.id,
          ...(typeof model.owned_by === "string" ? { ownedBy: model.owned_by } : {}),
          ...(typeof model.created === "number" ? { createdAt: model.created } : {}),
        }]
      : [],
  );
}

export async function generateWithOpenAICompatible(
  options: OpenAICompatibleGenerateOptions,
): Promise<OpenAICompatibleGenerateResult> {
  if (!options.model.trim()) {
    throw new OpenAICompatibleError("A model name is required.", "INVALID_RESPONSE");
  }
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const startedAt = performance.now();
  const response = await request(
    endpointUrl(options.endpoint, "/chat/completions"),
    {
      method: "POST",
      headers: { ...requestHeaders(options.apiKey), "content-type": "application/json" },
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
    throw new OpenAICompatibleError(`The provider returned HTTP ${response.status}.`, "HTTP_ERROR");
  }
  const data = (await response.json()) as {
    model?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new OpenAICompatibleError("The provider returned an invalid response.", "INVALID_RESPONSE");
  }
  return {
    model: typeof data.model === "string" ? data.model : options.model,
    response: content,
    ...(typeof data.usage?.prompt_tokens === "number" ? { promptTokens: data.usage.prompt_tokens } : {}),
    ...(typeof data.usage?.completion_tokens === "number" ? { responseTokens: data.usage.completion_tokens } : {}),
    durationMs: Math.round(performance.now() - startedAt),
  };
}
