export type FetchImplementation = typeof fetch;

export interface OllamaModel {
  name: string;
  size?: number;
  modifiedAt?: string;
}

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  format?: "json" | Record<string, unknown>;
  temperature?: number;
  endpoint?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export interface OllamaGenerateResult {
  model: string;
  response: string;
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
}

export class OllamaError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_ENDPOINT"
      | "UNREACHABLE"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

function localEndpoint(endpoint = "http://127.0.0.1:11434"): URL {
  const url = new URL(endpoint);
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new OllamaError(
      "The Ollama endpoint must use HTTP on localhost, 127.0.0.1, or ::1.",
      "INVALID_ENDPOINT",
    );
  }
  return url;
}

function endpointUrl(endpoint: string | undefined, pathname: string): URL {
  const base = localEndpoint(endpoint);
  base.pathname = pathname;
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
    throw new OllamaError(`Ollama is unreachable: ${message}`, "UNREACHABLE");
  }
}

export async function listOllamaModels(options: {
  endpoint?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
} = {}): Promise<OllamaModel[]> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await request(
    endpointUrl(options.endpoint, "/api/tags"),
    { method: "GET" },
    fetchImplementation,
    options.timeoutMs ?? 2_500,
  );

  if (!response.ok) {
    throw new OllamaError(`Ollama returned HTTP ${response.status}.`, "HTTP_ERROR");
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: unknown; size?: unknown; modified_at?: unknown }>;
  };
  if (!Array.isArray(data.models)) {
    throw new OllamaError("Ollama returned an invalid model list.", "INVALID_RESPONSE");
  }

  return data.models.flatMap((model) =>
    typeof model.name === "string"
      ? [
          {
            name: model.name,
            ...(typeof model.size === "number" ? { size: model.size } : {}),
            ...(typeof model.modified_at === "string"
              ? { modifiedAt: model.modified_at }
              : {}),
          },
        ]
      : [],
  );
}

export async function generateWithOllama(
  options: OllamaGenerateOptions,
): Promise<OllamaGenerateResult> {
  if (!options.model.trim()) {
    throw new OllamaError("An Ollama model name is required.", "INVALID_RESPONSE");
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const startedAt = performance.now();
  const response = await request(
    endpointUrl(options.endpoint, "/api/generate"),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        prompt: options.prompt,
        ...(options.system ? { system: options.system } : {}),
        ...(options.format ? { format: options.format } : {}),
        ...(options.temperature !== undefined
          ? { options: { temperature: options.temperature } }
          : {}),
        stream: false,
        think: false,
      }),
    },
    fetchImplementation,
    options.timeoutMs ?? 120_000,
  );

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new OllamaError(
      `Ollama returned HTTP ${response.status}${body ? `: ${body}` : "."}`,
      "HTTP_ERROR",
    );
  }

  const data = (await response.json()) as {
    model?: unknown;
    response?: unknown;
    prompt_eval_count?: unknown;
    eval_count?: unknown;
  };
  if (typeof data.response !== "string") {
    throw new OllamaError("Ollama returned an invalid generation response.", "INVALID_RESPONSE");
  }

  return {
    model: typeof data.model === "string" ? data.model : options.model,
    response: data.response,
    ...(typeof data.prompt_eval_count === "number"
      ? { promptTokens: data.prompt_eval_count }
      : {}),
    ...(typeof data.eval_count === "number"
      ? { responseTokens: data.eval_count }
      : {}),
    durationMs: Math.round(performance.now() - startedAt),
  };
}
