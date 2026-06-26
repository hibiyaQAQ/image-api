const TOKEN_PRICE_PER_MILLION = {
  "gpt-image-2": {
    textInput: 5,
    textCachedInput: 1.25,
    imageInput: 8,
    imageCachedInput: 2,
    imageOutput: 30,
    textOutput: 0
  },
  "gpt-image-1.5": {
    textInput: 5,
    textCachedInput: 1.25,
    imageInput: 8,
    imageCachedInput: 2,
    imageOutput: 32,
    textOutput: 10
  },
  "gpt-image-1-mini": {
    textInput: 2,
    textCachedInput: 0.2,
    imageInput: 2.5,
    imageCachedInput: 0.25,
    imageOutput: 8,
    textOutput: 0
  }
};

const IMAGE_OUTPUT_PRICE = {
  "gpt-image-2": {
    "1024x1024": { low: 0.006, medium: 0.053, high: 0.211 },
    "1024x1536": { low: 0.005, medium: 0.041, high: 0.165 },
    "1536x1024": { low: 0.005, medium: 0.041, high: 0.165 }
  },
  "gpt-image-1.5": {
    "1024x1024": { low: 0.009, medium: 0.034, high: 0.133 },
    "1024x1536": { low: 0.013, medium: 0.05, high: 0.2 },
    "1536x1024": { low: 0.013, medium: 0.05, high: 0.2 }
  },
  "gpt-image-1": {
    "1024x1024": { low: 0.011, medium: 0.042, high: 0.167 },
    "1024x1536": { low: 0.016, medium: 0.063, high: 0.25 },
    "1536x1024": { low: 0.016, medium: 0.063, high: 0.25 }
  },
  "gpt-image-1-mini": {
    "1024x1024": { low: 0.005, medium: 0.011, high: 0.036 },
    "1024x1536": { low: 0.006, medium: 0.015, high: 0.052 },
    "1536x1024": { low: 0.006, medium: 0.015, high: 0.052 }
  }
};

function roundUsd(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeQuality(value) {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function normalizeSize(value) {
  if (value === "1024x1024" || value === "1024x1536" || value === "1536x1024") return value;
  return "1024x1024";
}

function imageCount(requestBody, responseBody) {
  if (Array.isArray(responseBody?.data) && responseBody.data.length > 0) {
    return responseBody.data.length;
  }

  const requested = Number(requestBody?.n);
  return Number.isFinite(requested) && requested > 0 ? requested : 1;
}

function cachedTokenCount(details) {
  return numberOrZero(details?.cached_tokens) + numberOrZero(details?.cached_text_tokens) + numberOrZero(details?.cached_image_tokens);
}

function costFromUsage(model, usage) {
  const price = TOKEN_PRICE_PER_MILLION[model];
  if (!price || !usage) return null;

  const inputDetails = usage.input_tokens_details || {};
  const outputDetails = usage.output_tokens_details || {};

  const inputText = numberOrZero(inputDetails.text_tokens);
  const inputImage = numberOrZero(inputDetails.image_tokens);
  const cached = cachedTokenCount(inputDetails);
  const cachedText = numberOrZero(inputDetails.cached_text_tokens);
  const cachedImage = numberOrZero(inputDetails.cached_image_tokens);

  const billableTextInput = Math.max(0, inputText - cachedText);
  const billableImageInput = Math.max(0, inputImage - cachedImage);
  const outputImage = outputDetails.image_tokens ?? usage.output_tokens ?? 0;
  const outputText = outputDetails.text_tokens ?? 0;

  const costUsd =
    (billableTextInput * price.textInput) / 1_000_000 +
    (cachedText * price.textCachedInput) / 1_000_000 +
    (billableImageInput * price.imageInput) / 1_000_000 +
    (cachedImage * price.imageCachedInput) / 1_000_000 +
    (numberOrZero(outputImage) * price.imageOutput) / 1_000_000 +
    (numberOrZero(outputText) * price.textOutput) / 1_000_000;

  return {
    costUsd: roundUsd(costUsd),
    method: "usage",
    usage: {
      inputTokens: numberOrZero(usage.input_tokens),
      inputTextTokens: inputText,
      inputImageTokens: inputImage,
      cachedTextTokens: cachedText,
      cachedImageTokens: cachedImage,
      cachedInputTokens: cached,
      billableTextInputTokens: billableTextInput,
      billableImageInputTokens: billableImageInput,
      outputTokens: numberOrZero(usage.output_tokens),
      outputImageTokens: numberOrZero(outputImage),
      outputTextTokens: numberOrZero(outputText),
      totalTokens: numberOrZero(usage.total_tokens)
    }
  };
}

function costFromSizeAndQuality(model, requestBody, responseBody) {
  const table = IMAGE_OUTPUT_PRICE[model];
  if (!table) return null;

  const size = normalizeSize(responseBody?.size || requestBody?.size);
  const quality = normalizeQuality(responseBody?.quality || requestBody?.quality);
  const unitPrice = table[size]?.[quality];

  if (!Number.isFinite(unitPrice)) return null;

  return {
    costUsd: roundUsd(unitPrice * imageCount(requestBody, responseBody)),
    method: "size_quality",
    usage: null
  };
}

export function estimateImageCost({ requestBody = {}, responseBody = null } = {}) {
  const model = responseBody?.model || requestBody.model;
  if (!model) {
    return {
      costUsd: null,
      method: "unknown",
      model: null,
      size: responseBody?.size || requestBody.size || "auto",
      quality: responseBody?.quality || requestBody.quality || "auto",
      imageCount: imageCount(requestBody, responseBody),
      usage: null
    };
  }

  const usageCost = costFromUsage(model, responseBody?.usage);
  const fallbackCost = usageCost || costFromSizeAndQuality(model, requestBody, responseBody);

  return {
    costUsd: fallbackCost ? fallbackCost.costUsd : null,
    method: fallbackCost ? fallbackCost.method : "unknown",
    model,
    size: responseBody?.size || requestBody.size || "auto",
    quality: responseBody?.quality || requestBody.quality || "auto",
    imageCount: imageCount(requestBody, responseBody),
    usage: fallbackCost?.usage || null
  };
}

export function getPricingTables() {
  return {
    tokenPricePerMillion: TOKEN_PRICE_PER_MILLION,
    imageOutputPrice: IMAGE_OUTPUT_PRICE
  };
}
