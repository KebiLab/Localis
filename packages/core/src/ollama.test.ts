import assert from "node:assert/strict";
import test from "node:test";

import {
  generateWithOllama,
  listOllamaModels,
  OllamaError,
  type FetchImplementation,
} from "./ollama.js";

test("Ollama generation uses the non-streaming local API contract", async () => {
  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      model: "qwen-test",
      response: "The project is ready.",
      prompt_eval_count: 42,
      eval_count: 7,
    });
  }) as FetchImplementation;

  const result = await generateWithOllama({
    model: "qwen-test",
    prompt: "Inspect this project.",
    system: "Be precise.",
    fetchImplementation: fakeFetch,
  });

  assert.equal(requestUrl, "http://127.0.0.1:11434/api/generate");
  assert.equal(requestBody.stream, false);
  assert.equal(requestBody.think, false);
  assert.equal(result.response, "The project is ready.");
  assert.equal(result.promptTokens, 42);
});

test("Ollama model discovery normalizes the tags response", async () => {
  const fakeFetch = (async () =>
    Response.json({
      models: [
        { name: "qwen2.5-coder:7b", size: 4_000, modified_at: "2026-01-01" },
        { invalid: true },
      ],
    })) as FetchImplementation;

  const models = await listOllamaModels({ fetchImplementation: fakeFetch });

  assert.deepEqual(models, [
    {
      name: "qwen2.5-coder:7b",
      size: 4_000,
      modifiedAt: "2026-01-01",
    },
  ]);
});

test("Ollama rejects non-loopback endpoints before making a request", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return Response.json({});
  }) as FetchImplementation;

  await assert.rejects(
    listOllamaModels({
      endpoint: "https://models.example.com",
      fetchImplementation: fakeFetch,
    }),
    (error: unknown) =>
      error instanceof OllamaError && error.code === "INVALID_ENDPOINT",
  );
  assert.equal(called, false);
});
