import assert from "node:assert/strict";
import test from "node:test";

import { estimateImageCost } from "../src/cost.js";

test("有 usage 时优先按 token 费用估算", () => {
  const result = estimateImageCost({
    requestBody: {
      model: "gpt-image-2",
      size: "1024x1024",
      quality: "medium"
    },
    responseBody: {
      usage: {
        input_tokens_details: {
          image_tokens: 576,
          text_tokens: 97
        },
        output_tokens: 1756,
        output_tokens_details: {
          image_tokens: 1756,
          text_tokens: 0
        },
        total_tokens: 2429
      }
    }
  });

  assert.equal(result.method, "usage");
  assert.equal(result.costUsd, 0.057773);
  assert.equal(result.usage.inputTokens, 0);
  assert.equal(result.usage.inputImageTokens, 576);
  assert.equal(result.usage.inputTextTokens, 97);
  assert.equal(result.usage.outputImageTokens, 1756);
  assert.equal(result.usage.outputTokens, 1756);
  assert.equal(result.usage.totalTokens, 2429);
});

test("没有 usage 时按模型、尺寸和质量估算", () => {
  const result = estimateImageCost({
    requestBody: {
      model: "gpt-image-2",
      n: 2,
      size: "1024x1024",
      quality: "medium"
    },
    responseBody: {
      data: [{}, {}],
      size: "1024x1024",
      quality: "medium"
    }
  });

  assert.equal(result.method, "size_quality");
  assert.equal(result.costUsd, 0.106);
  assert.equal(result.imageCount, 2);
});
