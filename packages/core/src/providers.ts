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

export type LocalModelProvider = "ollama" | "lmstudio";
export type LocalModel = { name: string; size?: number; modifiedAt?: string; ownedBy?: string };
export type LocalGenerateResult = OllamaGenerateResult | LMStudioGenerateResult;

export interface LocalProviderOptions {
  provider: LocalModelProvider;
  endpoint?: string;
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
  throw new Error(`Unknown local model provider: ${value}. Use ollama or lmstudio.`);
}

export async function listLocalModels(options: LocalProviderOptions): Promise<LocalModel[]> {
  return options.provider === "lmstudio"
    ? listLMStudioModels(options)
    : listOllamaModels(options);
}

export async function generateWithLocalModel(
  options: LocalGenerateOptions,
): Promise<LocalGenerateResult> {
  return options.provider === "lmstudio"
    ? generateWithLMStudio(options)
    : generateWithOllama(options);
}
