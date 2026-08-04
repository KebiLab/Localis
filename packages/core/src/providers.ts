import {
  generateWithLMStudio,
  listLMStudioModels,
  type LMStudioGenerateResult,
} from "./lmstudio.js";
import {
  generateWithOllama,
  listOllamaModels,
  type FetchImplementation,
  type OllamaGenerateResult,
} from "./ollama.js";
import {
  generateWithOpenAICompatible,
  listOpenAICompatibleModels,
  type OpenAICompatibleGenerateResult,
} from "./openai-compatible.js";

export type LocalModelProvider = "ollama" | "lmstudio" | "openai-compatible";
export type LocalModel = { name: string; size?: number; modifiedAt?: string; ownedBy?: string };
export type LocalGenerateResult = OllamaGenerateResult | LMStudioGenerateResult | OpenAICompatibleGenerateResult;

export interface LocalProviderOptions {
  provider: LocalModelProvider;
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export interface LocalGenerateOptions extends LocalProviderOptions {
  model: string;
  prompt: string;
  system?: string;
  format?: "json" | Record<string, unknown>;
  temperature?: number;
}

export function parseLocalModelProvider(value: string | undefined): LocalModelProvider {
  if (!value || value === "ollama") return "ollama";
  if (value === "lmstudio") return "lmstudio";
  if (value === "openai-compatible") return "openai-compatible";
  throw new Error(`Unknown model provider: ${value}. Use ollama, lmstudio, or openai-compatible.`);
}

export async function listLocalModels(options: LocalProviderOptions): Promise<LocalModel[]> {
  if (options.provider === "lmstudio") return listLMStudioModels(options);
  if (options.provider === "openai-compatible") return listOpenAICompatibleModels(options);
  return listOllamaModels(options);
}

export async function generateWithLocalModel(
  options: LocalGenerateOptions,
): Promise<LocalGenerateResult> {
  if (options.provider === "lmstudio") return generateWithLMStudio(options);
  if (options.provider === "openai-compatible") return generateWithOpenAICompatible(options);
  return generateWithOllama(options);
}
