import assert from "node:assert/strict";
import test from "node:test";

import {
  generateWithOpenAICompatible,
  listOpenAICompatibleModels,
  OpenAICompatibleError,
} from "./openai-compatible.js";

test("compatible provider discovers models with bearer authentication", async () => {
  let authorization = "";
  const models = await listOpenAICompatibleModels({
    endpoint: "https://models.example.com/v1",
    // localis-ignore-next-line secret.generic-assignment -- synthetic test credential
    apiKey: "secret-key",
    fetchImplementation: async (input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      assert.equal(String(input), "https://models.example.com/v1/models");
      return Response.json({ data: [{ id: "coder-large", owned_by: "example", created: 42 }] });
    },
  });
  assert.equal(authorization, "Bearer secret-key");
  assert.deepEqual(models, [{ name: "coder-large", ownedBy: "example", createdAt: 42 }]);
});

test("compatible provider uses the chat completions contract", async () => {
  const result = await generateWithOpenAICompatible({
    endpoint: "https://models.example.com/v1",
    // localis-ignore-next-line secret.generic-assignment -- synthetic test credential
    apiKey: "secret-key",
    model: "coder-large",
    system: "Be precise.",
    prompt: "Explain this project.",
    fetchImplementation: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; messages: unknown[] };
      assert.equal(body.model, "coder-large");
      assert.equal(body.messages.length, 2);
      return Response.json({
        model: "coder-large-2026",
        choices: [{ message: { content: "A private workspace." } }],
        usage: { prompt_tokens: 12, completion_tokens: 4 },
      });
    },
  });
  assert.equal(result.model, "coder-large-2026");
  assert.equal(result.response, "A private workspace.");
  assert.equal(result.promptTokens, 12);
});

test("compatible provider rejects insecure remote endpoints", async () => {
  await assert.rejects(
    listOpenAICompatibleModels({ endpoint: "http://models.example.com/v1" }),
    (error: unknown) => error instanceof OpenAICompatibleError && error.code === "INVALID_ENDPOINT",
  );
});
