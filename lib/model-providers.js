import { buildLayoutAdvice, getScriptNegativeGuide, mockChatAnswer } from "@/lib/calligraphy";

function getTextProvider() {
  return (process.env.TEXT_MODEL_PROVIDER || "mock").toLowerCase();
}

function getTextModelConfig() {
  const provider = getTextProvider();
  const defaults = {
    deepseek: {
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
    },
    qwen: {
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
    },
  };

  return {
    provider,
    baseUrl: process.env.TEXT_MODEL_BASE_URL || defaults[provider]?.baseUrl || "",
    apiKey: process.env.TEXT_MODEL_API_KEY || "",
    model: process.env.TEXT_MODEL_NAME || defaults[provider]?.model || "mock",
  };
}

function getImageProvider() {
  return (process.env.IMAGE_MODEL_PROVIDER || "mock").toLowerCase();
}

function getImageModelConfig() {
  const provider = getImageProvider();
  const defaults = {
    qwen: {
      baseUrl: "https://dashscope.aliyuncs.com/api/v1",
      model: "qwen-image-plus",
    },
  };

  return {
    provider,
    baseUrl: process.env.IMAGE_MODEL_BASE_URL || defaults[provider]?.baseUrl || "",
    apiKey: process.env.IMAGE_MODEL_API_KEY || "",
    model: process.env.IMAGE_MODEL_NAME || defaults[provider]?.model || "mock",
  };
}

export async function answerCalligraphyQuestion(question) {
  const config = getTextModelConfig();

  if (config.provider === "mock") {
    return {
      provider: "mock",
      answer: mockChatAnswer(question),
    };
  }

  if (config.provider === "deepseek" || config.provider === "qwen") {
    return callOpenAICompatibleChat({
      ...config,
      messages: [
        {
          role: "system",
          content:
            "你是书法教育助手。只回答书法史、书体、碑帖、名家、技法、章法、临摹方法、作品创作与展示相关问题。明显无关书法时，只回复：本平台主要服务书法学习与创作。",
        },
        { role: "user", content: question },
      ],
    });
  }

  throw new Error(`暂不支持的文本模型供应商：${config.provider}`);
}

export async function createLayoutAdvice(payload) {
  const config = getTextModelConfig();

  if (config.provider === "mock") {
    return {
      provider: "mock",
      advice: buildLayoutAdvice(payload),
    };
  }

  if (config.provider === "deepseek" || config.provider === "qwen") {
    const result = await callOpenAICompatibleChat({
      ...config,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是书法章法设计助手。请只输出 JSON，字段为 charSpacing、lineSpacing、signature、seal、overall，内容使用中文。",
        },
        {
          role: "user",
          content: `请为文字“${payload.text}”和作品形式“${payload.format}”生成章法建议。`,
        },
      ],
    });

    try {
      return {
        provider: result.provider,
        advice: JSON.parse(result.answer),
      };
    } catch {
      return {
        provider: result.provider,
        advice: {
          ...buildLayoutAdvice(payload),
          overall: result.answer,
        },
      };
    }
  }

  throw new Error(`暂不支持的文本模型供应商：${config.provider}`);
}

export async function generateCalligraphyImage({ prompt, format, script }) {
  const config = getImageModelConfig();

  if (config.provider === "mock") {
    return { provider: "mock", imageUrl: null };
  }

  if (config.provider === "qwen") {
    return callQwenImage({ ...config, prompt, size: imageSizeForFormat(format), script });
  }

  throw new Error(`暂不支持的图片模型供应商：${config.provider}`);
}

async function callOpenAICompatibleChat({ provider, baseUrl, apiKey, model, messages, responseFormat }) {
  if (!apiKey) {
    throw new Error(`请先配置 ${provider} 的 TEXT_MODEL_API_KEY，或将 TEXT_MODEL_PROVIDER 改回 mock。`);
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `${provider} 模型请求失败`);
  }

  return {
    provider,
    answer: data.choices?.[0]?.message?.content || "",
  };
}

function imageSizeForFormat(format) {
  if (format === "横幅") return "1664*928";
  if (format === "条幅" || format === "中堂" || format === "对联") return "928*1664";
  return "1328*1328";
}

async function callQwenImage({ provider, baseUrl, apiKey, model, prompt, size, script, referenceImageUrl, negativePrompt }) {
  if (!apiKey) {
    throw new Error("请先配置千问图像生成的 IMAGE_MODEL_API_KEY，或将 IMAGE_MODEL_PROVIDER 改回 mock。");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [
                ...(referenceImageUrl ? [{ image: referenceImageUrl }] : []),
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          negative_prompt: `${negativePrompt || "低清晰度，低质量，乱码，错别字，多余文字，现代印刷字体，水印，杂乱背景，边框破损，过度装饰。"}${getScriptNegativeGuide(script)}`,
          prompt_extend: false,
          watermark: false,
          size,
          n: 1,
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || data.code) {
    throw new Error(data.message || "千问图像生成请求失败");
  }

  const imageUrl = data.output?.choices?.[0]?.message?.content?.find((item) => item.image)?.image;
  if (!imageUrl) {
    throw new Error("千问图像生成成功但没有返回图片地址。");
  }

  return {
    provider,
    imageUrl,
    requestId: data.request_id,
  };
}
