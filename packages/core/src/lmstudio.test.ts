import assert from "node:assert/strict";
import test from "node:test";

import {
  generateWithLMStudio,
  listLMStudioModels,
  LMStudioError,
} from "./lmstudio.js";
import type { FetchImplementation } from "./ollama.js";

test("LM Studio generation uses its local OpenAI-compatible API", async () => {
  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      model: "local-coder",
      choices: [{ message: { content: "{\"ready\":true}" } }],
      usage: { prompt_tokens: 12, completion_tokens: 4 },
    });
  }) as FetchImplementation;

  const result = await generateWithLMStudio({
    model: "local-coder",
    prompt: "Inspect the project.",
    system: "Be precise.",
    format: { type: "object" },
    fetchImplementation: fakeFetch,
  });

  assert.equal(requestUrl, "http://127.0.0.1:1234/v1/chat/completions");
  assert.equal(requestBody.stream, false);
  assert.equal((requestBody.response_format as { type?: string }).type, "json_schema");
  assert.equal(result.response, '{"ready":true}');
  assert.equal(result.promptTokens, 12);
});

test("LM Studio model discovery normalizes the OpenAI model list", async () => {
  const fakeFetch = (async () => Response.json({
    data: [{ id: "local-coder", owned_by: "lmstudio-community" }, { object: "model" }],
  })) as FetchImplementation;

  assert.deepEqual(await listLMStudioModels({ fetchImplementation: fakeFetch }), [
    { name: "local-coder", ownedBy: "lmstudio-community" },
  ]);
});

test("LM Studio rejects non-loopback endpoints before making a request", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return Response.json({});
  }) as FetchImplementation;

  await assert.rejects(
    listLMStudioModels({ endpoint: "https://models.example.com", fetchImplementation: fakeFetch }),
    (error: unknown) => error instanceof LMStudioError && error.code === "INVALID_ENDPOINT",
  );
  assert.equal(called, false);
});
