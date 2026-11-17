(() => {
  // src/shared/settings.js
  var PRESETS = {
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      keyUrl: "https://platform.deepseek.com/api_keys",
      note: "\u6A21\u578B\u4E00\u822C\u7528 deepseek-chat\u3002Key \u5728 platform.deepseek.com \u521B\u5EFA\u3002"
    },
    doubao: {
      id: "doubao",
      label: "\u8C46\u5305 \xB7 \u706B\u5C71\u65B9\u821F",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "",
      modelPlaceholder: "ep-xxxxxxxx",
      keyUrl: "https://console.volcengine.com/ark",
      note: "\u6A21\u578B\u4E00\u680F\u586B\u65B9\u821F\u7684\u63A8\u7406\u63A5\u5165\u70B9 ID\uFF08ep- \u5F00\u5934\uFF09\uFF0C\u4E0D\u662F\u63A7\u5236\u53F0\u4E0A\u7684\u5C55\u793A\u540D\u3002Key \u5728\u65B9\u821F\u300CAPI Key \u7BA1\u7406\u300D\u91CC\u521B\u5EFA\u3002"
    },
    qwen: {
      id: "qwen",
      label: "\u901A\u4E49\u5343\u95EE",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
      note: "\u517C\u5BB9\u6A21\u5F0F\u7684 Base URL \u8981\u5E26 /compatible-mode/v1\u3002\u6A21\u578B\u53EF\u7528 qwen-plus\u3001qwen-turbo\u3002"
    },
    kimi: {
      id: "kimi",
      label: "Kimi",
      baseUrl: "https://api.moonshot.cn/v1",
      model: "moonshot-v1-8k",
      keyUrl: "https://platform.moonshot.cn/console/api-keys",
      note: "\u6A21\u578B\u53EF\u7528 moonshot-v1-8k \u6216 moonshot-v1-auto\u3002"
    },
    zhipu: {
      id: "zhipu",
      label: "智谱 GLM",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4-flash",
      keyUrl: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
      note: "模型可用 glm-4-flash、glm-4-air、glm-4-plus，以账号权限为准。"
    },
    minimax: {
      id: "minimax",
      label: "MiniMax",
      baseUrl: "https://api.minimaxi.com/v1",
      model: "MiniMax-M2",
      keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
      note: "模型可用 MiniMax-M2、MiniMax-Text-01，以控制台为准。"
    },
    wenxin: {
      id: "wenxin",
      label: "文心 · 百度千帆",
      baseUrl: "https://qianfan.baidubce.com/v2",
      model: "ernie-4.0-8k",
      keyUrl: "https://console.bce.baidu.com/qianfan/ais/console/apiKey",
      note: "使用千帆 ModelBuilder 的 API Key；模型可用 ernie-4.0-8k、ernie-speed-128k，以控制台为准。"
    },
    hunyuan: {
      id: "hunyuan",
      label: "腾讯混元",
      baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
      model: "hunyuan-turbo",
      keyUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
      note: "模型可用 hunyuan-turbo、hunyuan-lite、hunyuan-standard，以控制台为准。"
    },
    spark: {
      id: "spark",
      label: "讯飞星火",
      baseUrl: "https://spark-api-open.xf-yun.com/v1",
      model: "generalv3.5",
      keyUrl: "https://console.xfyun.cn/",
      note: "模型可用 lite、generalv3、generalv3.5、4.0Ultra；API Key 填控制台对应应用的 APIPassword。"
    },
    stepfun: {
      id: "stepfun",
      label: "阶跃星辰",
      baseUrl: "https://api.stepfun.com/v1",
      model: "step-2-16k",
      keyUrl: "https://platform.stepfun.com/interface-key",
      note: "模型可用 step-2-16k、step-1-8k，以控制台为准。"
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-mini",
      keyUrl: "https://openrouter.ai/keys",
      note: "聚合各家模型。模型名带厂商前缀，例如 openai/gpt-4o-mini、anthropic/claude-3.5-haiku、deepseek/deepseek-chat，以 openrouter.ai/models 为准。"
    },
    siliconflow: {
      id: "siliconflow",
      label: "硅基流动",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "deepseek-ai/DeepSeek-V3",
      keyUrl: "https://cloud.siliconflow.cn/account/ak",
      note: "模型名带厂商前缀，例如 deepseek-ai/DeepSeek-V3、Qwen/Qwen2.5-72B-Instruct、THUDM/glm-4-9b-chat，以云平台模型广场为准。"
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      keyUrl: "https://platform.openai.com/api-keys",
      note: "\u6A21\u578B\u540D\u6309\u8D26\u53F7\u6743\u9650\u586B\u5199\uFF0C\u4F8B\u5982 gpt-4o-mini\u3002"
    },
    custom: {
      id: "custom",
      label: "\u81EA\u5B9A\u4E49",
      baseUrl: "",
      model: "",
      keyUrl: "",
      note: "\u4EFB\u4F55 OpenAI \u517C\u5BB9\u63A5\u53E3\uFF1A\u5411 {Base URL}/chat/completions \u53D1 POST\uFF0CBearer \u9274\u6743\uFF0C\u5E76\u652F\u6301 stream\u3002"
    }
  };
  var LANGUAGES = [
    { id: "zh", label: "\u7B80\u4F53\u4E2D\u6587" },
    { id: "zh-Hant", label: "\u7E41\u4F53\u4E2D\u6587" },
    { id: "en", label: "English" },
    { id: "ja", label: "\u65E5\u672C\u8A9E" }
  ];
  var LENGTHS = [
    { id: "brief", label: "\u7B80\u77ED" },
    { id: "standard", label: "\u6807\u51C6" },
    { id: "detailed", label: "\u8BE6\u7EC6" }
  ];
  var DEFAULT_SETTINGS = {
    enabled: true,
    provider: "deepseek",
    baseUrl: PRESETS.deepseek.baseUrl,
    apiKey: "",
    model: PRESETS.deepseek.model,
    outputLanguage: "zh",
    length: "standard",
    triggerMode: "icon",
    blacklist: "",
    imaClientId: "",
    imaApiKey: "",
    imaFolderId: "",
    imaFolderName: ""
  };
  function normalizeBaseUrl(input) {
    let url = String(input || "").trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/\/+$/, "");
    url = url.replace(/\/chat\/completions$/i, "");
    url = url.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(url)) return "";
    return url;
  }
  function normalizeApiKey(input) {
    return String(input || "").trim().replace(/^Bearer\s+/i, "");
  }
  function normalizeSettings(raw = {}) {
    const provider = PRESETS[raw.provider] ? raw.provider : DEFAULT_SETTINGS.provider;
    const language = LANGUAGES.some((item) => item.id === raw.outputLanguage) ? raw.outputLanguage : DEFAULT_SETTINGS.outputLanguage;
    const length = LENGTHS.some((item) => item.id === raw.length) ? raw.length : DEFAULT_SETTINGS.length;
    const triggerMode = raw.triggerMode === "immediate" ? "immediate" : "icon";
    return {
      enabled: raw.enabled !== false,
      provider,
      baseUrl: normalizeBaseUrl(raw.baseUrl || PRESETS[provider].baseUrl || ""),
      apiKey: normalizeApiKey(raw.apiKey),
      model: String(raw.model ?? PRESETS[provider].model ?? "").trim(),
      outputLanguage: language,
      length,
      triggerMode,
      blacklist: typeof raw.blacklist === "string" ? raw.blacklist : "",
      imaClientId: String(raw.imaClientId ?? "").trim(),
      imaApiKey: String(raw.imaApiKey ?? "").trim(),
      imaFolderId: String(raw.imaFolderId ?? "").trim(),
      imaFolderName: String(raw.imaFolderName ?? "").trim()
    };
  }
  const IMA_SKILL_VERSION = "1.1.10";
  async function imaRequest(apiPath, body, settings) {
    const clientId = settings.imaClientId;
    const apiKey = settings.imaApiKey;
    if (!clientId || !apiKey) {
      throw new Error("\u8FD8\u6CA1\u6709\u914D\u7F6E ima \u7684 Client ID \u548C API Key\u3002");
    }
    let raw;
    try {
      const res = await fetch(`https://ima.qq.com/${apiPath}`, {
        method: "POST",
        headers: {
          "ima-openapi-clientid": clientId,
          "ima-openapi-apikey": apiKey,
          "ima-openapi-ctx": `skill_version=${IMA_SKILL_VERSION}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      raw = await res.text();
    } catch {
      throw new Error("\u8FDE\u4E0D\u4E0A ima\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u3002");
    }
    let resp;
    try {
      resp = JSON.parse(raw || "{}");
    } catch {
      throw new Error("ima \u8FD4\u56DE\u4E86\u65E0\u6CD5\u8BC6\u522B\u7684\u5185\u5BB9\u3002");
    }
    if (resp.code !== 0) {
      const known = {
        100001: "\u53C2\u6570\u9519\u8BEF\uFF0C\u68C0\u67E5\u8BF7\u6C42\u5185\u5BB9\u3002",
        100002: "\u51ED\u8BC1\u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5 Client ID \u548C API Key\u3002",
        100003: "ima \u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
        100004: "\u5185\u5BB9\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\u3002",
        100005: "\u6CA1\u6709\u6743\u9650\u64CD\u4F5C\u8FD9\u4E2A\u7B14\u8BB0\u3002",
        100009: "\u7B14\u8BB0\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\u3002",
        310001: "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u7B14\u8BB0\u672C\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
        20002: "ima API Key \u8D85\u8FC7\u9891\u7387\u9650\u5236\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002",
        20004: "ima \u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 Client ID \u548C API Key\u3002",
        200002: "ima \u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 Client ID \u548C API Key \u662F\u5426\u6B63\u786E\u3001\u662F\u5426\u5DF2\u5728 ima \u5F00\u653E\u63A5\u53E3\u9875\u751F\u6548\u3002"
      };
      throw new Error(known[resp.code] || `ima \u8FD4\u56DE\u9519\u8BEF ${resp.code}\uFF1A${resp.msg || "\u672A\u77E5\u9519\u8BEF"}`);
    }
    return resp.data ?? {};
  }

  // src/shared/api.js
  var ApiError = class extends Error {
    constructor(status, body) {
      const text = typeof body === "string" ? body : "\u8BF7\u6C42\u5931\u8D25";
      super(text);
      this.name = "ApiError";
      this.status = status;
      this.body = typeof body === "string" ? body : "";
    }
  };
  function sanitizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ApiError(0, "\u6CA1\u6709\u8981\u89E3\u91CA\u7684\u5185\u5BB9\u3002");
    }
    const roles = /* @__PURE__ */ new Set(["system", "user", "assistant"]);
    return messages.slice(0, 16).map((message) => {
      if (!message || !roles.has(message.role) || typeof message.content !== "string") {
        throw new ApiError(0, "\u8BF7\u6C42\u683C\u5F0F\u4E0D\u5BF9\u3002");
      }
      return { role: message.role, content: message.content.slice(0, 8e3) };
    });
  }
  function processSseLine(line, onDelta) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return "ignore";
    const data = trimmed.slice(5).trim();
    if (!data) return "ignore";
    if (data === "[DONE]") return "done";
    try {
      const json = JSON.parse(data);
      const content = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? "";
      if (content) onDelta(content);
    } catch {
      return "ignore";
    }
    return "data";
  }
  async function readSse(stream, onDelta) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const take = (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (processSseLine(line, onDelta) === "done") return true;
      }
      return false;
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (take(decoder.decode(value, { stream: true }))) return;
      }
      buffer += decoder.decode();
      if (buffer.trim()) processSseLine(buffer, onDelta);
    } finally {
      reader.releaseLock?.();
    }
  }
  async function request(fetchImpl, url, apiKey, payload, signal) {
    return fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer"
    });
  }
  async function streamChat({
    baseUrl,
    apiKey,
    model,
    messages,
    maxTokens = 700,
    signal,
    fetchImpl = fetch,
    onDelta
  }) {
    const root = normalizeBaseUrl(baseUrl);
    const key = normalizeApiKey(apiKey);
    if (!root) throw new ApiError(0, "\u8FD8\u6CA1\u6709\u586B\u5199\u63A5\u53E3\u5730\u5740\u3002");
    if (!key) throw new ApiError(0, "\u8FD8\u6CA1\u6709\u586B\u5199 API Key\u3002");
    if (!String(model || "").trim()) throw new ApiError(0, "\u8FD8\u6CA1\u6709\u586B\u5199\u6A21\u578B\u540D\u3002\u8C46\u5305\u8BF7\u586B\u63A5\u5165\u70B9 ID\uFF08ep- \u5F00\u5934\uFF09\u3002");
    const url = `${root}/chat/completions`;
    let payload = {
      model: String(model).trim(),
      messages: sanitizeMessages(messages),
      temperature: 0.3,
      max_tokens: maxTokens,
      stream: true
    };
    let res = await request(fetchImpl, url, key, payload, signal);
    if (res.status === 400) {
      const text = await res.text();
      const next = { ...payload };
      let changed = false;
      if (/temperature/i.test(text)) {
        delete next.temperature;
        changed = true;
      }
      if (/max_tokens/i.test(text)) {
        delete next.max_tokens;
        changed = true;
      }
      if (!changed) throw new ApiError(400, text);
      payload = next;
      res = await request(fetchImpl, url, key, payload, signal);
    }
    if (!res.ok) {
      throw new ApiError(res.status, await res.text().catch(() => ""));
    }
    const type = res.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      if (text) onDelta(text);
      return;
    }
    if (!res.body) throw new ApiError(0, "\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE\u53EF\u8BFB\u7684\u5185\u5BB9\u3002");
    await readSse(res.body, onDelta);
  }

  // src/shared/errors.js
  function snippetFromBody(body) {
    const raw = String(body || "");
    try {
      const json = JSON.parse(raw);
      const message = json.error?.message || json.message;
      if (message) return String(message).replace(/\s+/g, " ").slice(0, 180);
    } catch {
    }
    return raw.replace(/\s+/g, " ").slice(0, 180);
  }
  function explainHttpError(status, body) {
    const snippet = snippetFromBody(body);
    if (status === 401 || status === 403) {
      return `\u5BC6\u94A5\u88AB\u62D2\u7EDD\uFF08${status}\uFF09\u3002\u8BF7\u68C0\u67E5 API Key\uFF1B\u8C46\u5305\u8FD8\u8981\u786E\u8BA4\u6A21\u578B\u680F\u586B\u7684\u662F\u63A5\u5165\u70B9 ID\u3002`;
    }
    if (status === 404) {
      return "\u627E\u4E0D\u5230\u63A5\u53E3\uFF08404\uFF09\u3002Base URL \u5E94\u505C\u5728 /v1 \u6216 /v3\uFF0C\u4E0D\u8981\u81EA\u5DF1\u52A0\u4E0A /chat/completions\u3002";
    }
    if (status === 429) return "\u8BF7\u6C42\u592A\u9891\u7E41\uFF0C\u6216\u989D\u5EA6\u7528\u5B8C\u4E86\u3002\u7A0D\u540E\u518D\u8BD5\u3002";
    if (status === 400) return `\u8BF7\u6C42\u88AB\u62D2\u7EDD\uFF08400\uFF09\uFF1A${snippet || "\u53C2\u6570\u4E0D\u88AB\u8FD9\u4E2A\u63A5\u53E3\u63A5\u53D7\u3002"}`;
    if (status === 0) return snippet || "\u8BF7\u6C42\u8FD8\u6CA1\u53D1\u51FA\u53BB\u3002";
    return `\u63A5\u53E3\u9519\u8BEF\uFF08${status}\uFF09${snippet ? `\uFF1A${snippet}` : ""}`;
  }
  function toUserError(err) {
    if (!err || err.name === "AbortError") return "";
    if (err.name === "ApiError" || typeof err.status === "number") {
      if (err.status === 0) return err.message;
      return explainHttpError(err.status, err.body || err.message || "");
    }
    const message = String(err.message || "");
    if (err.name === "TypeError" || /Failed to fetch|NetworkError|network/i.test(message)) {
      return "\u8FDE\u4E0D\u4E0A\u63A5\u53E3\u3002\u68C0\u67E5 Base URL\u3001\u7F51\u7EDC\uFF0C\u4EE5\u53CA\u6D4F\u89C8\u5668\u6709\u6CA1\u6709\u62E6\u622A\u8FD9\u4E2A\u5730\u5740\u3002";
    }
    return message || "\u89E3\u91CA\u5931\u8D25\u4E86\u3002";
  }

  // shared/prompt-spec.json
  var prompt_spec_default = {
    version: 1,
    sectionLabels: ["\u91CA\u4E49", "\u8BED\u5883", "\u5EF6\u4F38", "\u7FFB\u8BD1"],
    empty: "\uFF08\u65E0\uFF09",
    maxTokens: {
      brief: 360,
      standard: 700,
      detailed: 1200
    },
    systemTemplate: "\u4F60\u662F\u300C\u79D2\u61C2\u300D\u3002\u6709\u4EBA\u6B63\u5728\u9605\u8BFB\uFF0C\u521A\u521A\u9009\u4E2D\u4E00\u5C0F\u6BB5\u6587\u5B57\uFF08\u53EF\u80FD\u662F\u8BCD\u3001\u672F\u8BED\u3001\u7F29\u5199\u3001\u6982\u5FF5\u3001\u4EBA\u540D\u3001\u516C\u5F0F\u6216\u53E5\u5B50\uFF09\uFF0C\u5E0C\u671B\u4F60\u5C31\u5730\u89E3\u91CA\uFF0C\u4E0D\u8981\u628A\u8BDD\u9898\u626F\u5F00\u3002\u8BFB\u8005\u53D7\u8FC7\u6559\u80B2\uFF0C\u53EA\u662F\u773C\u524D\u8FD9\u4E2A\u8BF4\u6CD5\u4E0D\u719F\u3002\u5BF9\u65B9\u5E38\u8BFB\u793E\u4F1A\u5B66\u548C\u4EBA\u6587\u793E\u79D1\uFF0C\u4E5F\u4F1A\u78B0\u5230\u82F1\u6587\u3001\u7F29\u5199\u548C\u516C\u5F0F\u3002\u522B\u5199\u6210\u513F\u7AE5\u8BFB\u7269\uFF0C\u4E5F\u522B\u5806\u780C\u884C\u8BDD\u3002\n\n\u53EA\u8F93\u51FA\u4E0B\u9762\u56DB\u6BB5\u3002\u6BCF\u6BB5\u5355\u72EC\u8D77\u884C\uFF0C\u4EE5\u4E2D\u6587\u6807\u7B7E\u5F00\u5934\u3002\u4E0D\u8981\u7FFB\u8BD1\u6807\u7B7E\u672C\u8EAB\u3002\u4E0D\u8981\u5199\u524D\u8A00\u3001\u6807\u9898\u3001\u7F16\u53F7\u6216\u7ED3\u675F\u8BED\u3002\n\n\u3010\u91CA\u4E49\u3011\n\u3010\u8BED\u5883\u3011\n\u3010\u5EF6\u4F38\u3011\n\u3010\u7FFB\u8BD1\u3011\n\n\u5404\u6BB5\u600E\u4E48\u5199\uFF1A\n- \u3010\u91CA\u4E49\u3011\u53EA\u7528\u4E00\u53E5\u8BDD\uFF0C\u89E3\u91CA\u9009\u4E2D\u6587\u5B57\u672C\u8EAB\u7684\u76F4\u767D\u610F\u601D\u3002\u4E0D\u8981\u628A\u6240\u5728\u6BB5\u843D\u91CD\u8BF4\u4E00\u904D\u3002\n- \u3010\u8BED\u5883\u3011\u8BF4\u660E\u5B83\u5728\u7ED9\u5B9A\u6BB5\u843D\u91CC\u5177\u4F53\u6307\u4EC0\u4E48\u3001\u548C\u524D\u540E\u53E5\u662F\u4EC0\u4E48\u5173\u7CFB\u3002\u70B9\u5230\u4E3A\u6B62\u3002\n- \u3010\u5EF6\u4F38\u3011\u7ED9\u4E00\u4E2A\u8D34\u8FD1\u7684\u4F8B\u5B50\uFF0C\u6216\u4E24\u5230\u4E09\u4E2A\u76F8\u5173\u672F\u8BED\uFF08\u7528\u300C \xB7 \u300D\u8FDE\u63A5\uFF09\u3002\u6CA1\u6709\u5408\u9002\u7684\u5C31\u53EA\u5199\u300C\u65E0\u300D\u3002\n- \u3010\u7FFB\u8BD1\u3011{{translationRule}}\n\n\u82E5\u9009\u4E2D\u7684\u662F\u4EBA\u540D\uFF1A\u8BF4\u660E\u8FD9\u4E2A\u4EBA\u662F\u8C01\u3001\u5728\u8FD9\u7C7B\u8BA8\u8BBA\u91CC\u901A\u5E38\u56E0\u4E3A\u4EC0\u4E48\u88AB\u63D0\u5230\u3002\u4E0D\u8981\u5199\u4E00\u7BC7\u4F20\u8BB0\u3002\n\n\u7EA6\u675F\uFF1A\n- \u8F93\u51FA\u8BED\u8A00\uFF1A{{language}}\n- \u8BE6\u7565\uFF1A{{length}}\n- \u7528\u5E73\u5E38\u8BDD\u628A\u4E8B\u60C5\u8BF4\u6E05\u695A\u3002\u5FC5\u8981\u7684\u4E13\u540D\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u5728\u540E\u9762\u52A0\u4E00\u4E2A\u77ED\u6CE8\u3002\n- \u4E0D\u786E\u5B9A\u5C31\u76F4\u63A5\u8BF4\u4E0D\u786E\u5B9A\u3002\u4E0D\u8981\u7F16\u9020\u4E66\u540D\u3001\u9875\u7801\u3001\u5E74\u4EFD\u3001\u5F15\u6587\u6216\u7EDF\u8BA1\u6570\u5B57\u3002\n- \u9047\u5230\u516C\u5F0F\uFF0C\u53EA\u8BF4\u660E\u7B26\u53F7\u5728\u8FD9\u91CC\u5927\u6982\u8868\u793A\u4EC0\u4E48\uFF0C\u4E0D\u8981\u5C55\u5F00\u63A8\u5BFC\u3002\n- \u4E0D\u8981\u81EA\u79F0\u4EBA\u5DE5\u667A\u80FD\uFF0C\u4E0D\u8981\u5199\u300C\u6839\u636E\u4F60\u63D0\u4F9B\u7684\u4E0A\u4E0B\u6587\u300D\u300C\u5E0C\u671B\u8FD9\u5BF9\u4F60\u6709\u5E2E\u52A9\u300D\u8FD9\u7C7B\u5957\u8BDD\u3002",
    userTemplate: "\u9009\u4E2D\u6587\u5B57\uFF1A\n{{selection}}\n\n\u6240\u5728\u6BB5\u843D\uFF1A\n{{paragraph}}\n\n\u524D\u6587\uFF1A\n{{before}}\n\n\u540E\u6587\uFF1A\n{{after}}\n\n\u9875\u9762\u6807\u9898\uFF1A{{title}}\n\u7AD9\u70B9\uFF1A{{host}}\n\u8FD9\u6BB5\u9009\u4E2D\u6587\u5B57\u7684\u811A\u672C\uFF1A{{script}}",
    languages: {
      zh: "\u5168\u6587\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002\u4E13\u540D\u548C\u539F\u6587\u672F\u8BED\u53EF\u4EE5\u4FDD\u7559\u539F\u6587\u3002",
      "zh-Hant": "\u5168\u6587\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u3002\u5C08\u540D\u548C\u539F\u6587\u8853\u8A9E\u53EF\u4EE5\u4FDD\u7559\u539F\u6587\u3002",
      en: "Write the body of each section in English. Keep the Chinese section labels exactly as given. Keep proper nouns as they appear in the source.",
      ja: "\u5404\u6BB5\u306E\u672C\u6587\u306F\u65E5\u672C\u8A9E\u3067\u66F8\u304F\u3002\u898B\u51FA\u3057\u306E\u3010\u3011\u30E9\u30D9\u30EB\u306F\u4E2D\u56FD\u8A9E\u306E\u307E\u307E\u306B\u3059\u308B\u3002\u56FA\u6709\u540D\u8A5E\u306F\u539F\u6587\u306E\u307E\u307E\u6B8B\u3057\u3066\u3088\u3044\u3002"
    },
    translationRules: {
      zh: "\u9009\u4E2D\u6587\u5B57\u7684\u4E3B\u4F53\u82E5\u4E0D\u662F\u4E2D\u6587\uFF0C\u5728\u8FD9\u91CC\u7ED9\u51FA\u901A\u987A\u7684\u7B80\u4F53\u4E2D\u6587\u7FFB\u8BD1\uFF1B\u82E5\u4E3B\u4F53\u5DF2\u662F\u4E2D\u6587\uFF0C\u53EA\u5199\u300C\u65E0\u300D\u3002",
      "zh-Hant": "\u9078\u4E2D\u6587\u5B57\u7684\u4E3B\u9AD4\u82E5\u4E0D\u662F\u4E2D\u6587\uFF0C\u5728\u9019\u88E1\u7D66\u51FA\u901A\u9806\u7684\u7E41\u9AD4\u4E2D\u6587\u7FFB\u8B6F\uFF1B\u82E5\u4E3B\u9AD4\u5DF2\u662F\u4E2D\u6587\uFF0C\u53EA\u5BEB\u300C\u7121\u300D\u3002",
      en: 'If the selection is not primarily English, give a natural English translation; if it is already English, write "none".',
      ja: "\u9078\u3070\u308C\u305F\u6587\u5B57\u306E\u4E3B\u4F53\u304C\u65E5\u672C\u8A9E\u3067\u306A\u3051\u308C\u3070\u3001\u3053\u3053\u306B\u81EA\u7136\u306A\u65E5\u672C\u8A9E\u8A33\u3092\u66F8\u304F\u3002\u3059\u3067\u306B\u65E5\u672C\u8A9E\u306A\u3089\u300C\u7121\u300D\u3068\u3060\u3051\u66F8\u304F\u3002"
    },
    lengths: {
      brief: "\u5C3D\u91CF\u77ED\u3002\u3010\u91CA\u4E49\u3011\u4E00\u53E5\uFF1B\u3010\u8BED\u5883\u3011\u4E00\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u5199\u300C\u65E0\u300D\uFF0C\u9664\u975E\u4E00\u4E2A\u76F8\u5173\u672F\u8BED\u80FD\u6D88\u6389\u660E\u663E\u6B67\u4E49\u3002",
      standard: "\u3010\u91CA\u4E49\u3011\u4E00\u53E5\u8BDD\uFF1B\u3010\u8BED\u5883\u3011\u4E24\u5230\u56DB\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u4E00\u4E2A\u8D34\u8FD1\u7684\u4F8B\u5B50\uFF0C\u6216\u4E24\u5230\u4E09\u4E2A\u76F8\u5173\u672F\u8BED\u3002",
      detailed: "\u3010\u91CA\u4E49\u3011\u4E00\u5230\u4E24\u53E5\uFF0C\u628A\u8FB9\u754C\u8BF4\u6E05\uFF1B\u3010\u8BED\u5883\u3011\u56DB\u5230\u516D\u53E5\uFF1B\u3010\u5EF6\u4F38\u3011\u4E00\u4E2A\u5177\u4F53\u4F8B\u5B50\uFF0C\u5E76\u70B9\u51FA\u4E00\u4E2A\u5BB9\u6613\u6DF7\u6DC6\u7684\u90BB\u8FD1\u6982\u5FF5\u3002"
    },
    scripts: {
      zh: "\u4E2D\u6587\u4E3A\u4E3B",
      en: "\u62C9\u4E01\u5B57\u6BCD\u4E3A\u4E3B\uFF0C\u591A\u534A\u9700\u8981\u7FFB\u8BD1",
      mixed: "\u4E2D\u5916\u6587\u5939\u6742",
      ja: "\u65E5\u6587\u4E3A\u4E3B",
      other: "\u7B26\u53F7\u3001\u516C\u5F0F\u6216\u5176\u5B83\u6587\u5B57"
    },
    followUp: {
      preamble: "\u4E0B\u9762\u662F\u8FFD\u95EE\u3002\u8BF7\u76F4\u63A5\u7528\u6563\u6587\u56DE\u7B54\uFF0C\u4E0D\u8981\u518D\u4F7F\u7528\u3010\u91CA\u4E49\u3011\u3010\u8BED\u5883\u3011\u3010\u5EF6\u4F38\u3011\u3010\u7FFB\u8BD1\u3011\u8FD9\u4E9B\u6807\u7B7E\uFF0C\u4E5F\u4E0D\u8981\u5206\u6210\u56DB\u6BB5\u3002\u7D27\u6263\u5DF2\u7ECF\u89E3\u91CA\u8FC7\u7684\u9009\u4E2D\u6587\u5B57\u548C\u5B83\u6240\u5728\u7684\u6BB5\u843D\uFF0C\u4E0D\u8981\u53E6\u8D77\u65E0\u5173\u7684\u8BDD\u9898\u3002\u8F93\u51FA\u8BED\u8A00\uFF1A{{language}}\u3002\u4E0D\u786E\u5B9A\u5C31\u8BF4\u660E\u4E0D\u786E\u5B9A\uFF0C\u4E0D\u8981\u7F16\u9020\u51FA\u5904\u3002",
      elaborate: "\u8BF7\u8BB2\u5F97\u518D\u5177\u4F53\u4E00\u4E9B\uFF1A\u8865\u4E0A\u8FD9\u4E2A\u8BF4\u6CD5\u7684\u8FB9\u754C\u3001\u4E00\u4E2A\u80FD\u60F3\u8C61\u7684\u4F8B\u5B50\uFF0C\u4EE5\u53CA\u4E00\u4E2A\u5BB9\u6613\u6DF7\u5728\u4E00\u8D77\u7684\u90BB\u8FD1\u8BF4\u6CD5\u3002\u4E0D\u8981\u91CD\u590D\u521A\u624D\u5DF2\u7ECF\u8BF4\u8FC7\u7684\u539F\u53E5\u3002",
      question: "\u8BFB\u8005\u7684\u8FFD\u95EE\uFF1A{{question}}\n\u8BF7\u9488\u5BF9\u9009\u4E2D\u6587\u5B57\u300C{{selection}}\u300D\u548C\u5B83\u6240\u5728\u7684\u6BB5\u843D\u6765\u7B54\u3002\u77ED\u4E00\u4E9B\uFF0C\u4F46\u628A\u95EE\u9898\u7B54\u5B8C\u3002"
    }
  };

  // src/shared/prompt.js
  function maxTokensForLength(length, spec = prompt_spec_default) {
    return spec.maxTokens?.[length] || spec.maxTokens?.standard || 700;
  }

  // src/background/service-worker.js
  var controllers = /* @__PURE__ */ new Map();
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "huaci-explain",
        title: "\u7528\u79D2\u61C2\u89E3\u91CA",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
        }
      });
    });
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "huaci-explain" || tab?.id == null) return;
    const options = Number.isInteger(info.frameId) ? { frameId: info.frameId } : void 0;
    chrome.tabs.sendMessage(tab.id, { type: "explain-command" }, options).catch(() => {
    });
  });
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "explain-selection") return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id == null) return;
    chrome.tabs.sendMessage(tab.id, { type: "explain-command" }).catch(() => {
    });
  });
  async function readSettings() {
    const data = await chrome.storage.local.get("settings");
    return normalizeSettings(data.settings || {});
  }
  async function testConnection() {
    const settings = await readSettings();
    let text = "";
    await streamChat({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      maxTokens: 32,
      messages: [
        { role: "system", content: "\u4F60\u662F\u63A5\u53E3\u6D4B\u8BD5\u3002\u53EA\u56DE\u590D\u5C0F\u5199\u5B57\u6BCD ok\uFF0C\u4E0D\u8981\u52A0\u522B\u7684\u5B57\u3002" },
        { role: "user", content: "ping" }
      ],
      onDelta: (delta) => {
        text += delta;
      }
    });
    const snippet = text.trim().slice(0, 40);
    if (!snippet) return { ok: false, message: "\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE\u6587\u5B57\u3002" };
    return { ok: true, message: `\u901A\u4E86\u3002\u63A5\u53E3\u8FD4\u56DE\uFF1A\u300C${snippet}\u300D` };
  }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return false;
    if (msg.type === "open-options") {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === "test-connection") {
      testConnection().then((result) => sendResponse(result)).catch((err) => sendResponse({ ok: false, message: toUserError(err) || "\u6D4B\u8BD5\u5931\u8D25\u3002" }));
      return true;
    }
    if (msg.type === "save-to-ima") {
      (async () => {
        const data = await chrome.storage.local.get("settings");
        const settings = normalizeSettings(data.settings || {});
        if (settings.imaClientId && settings.imaApiKey) {
          try {
            await imaRequest("openapi/note/v1/import_doc", {
              content_format: 1,
              content: msg.markdown,
              ...(settings.imaFolderId ? { folder_id: settings.imaFolderId } : {})
            }, settings);
            return { ok: true, mode: "pushed" };
          } catch (err) {
            return { ok: false, message: err?.message || "\u63A8\u9001\u5230 ima \u5931\u8D25\u3002" };
          }
        }
        return saveToImaNote(msg);
      })().then((result) => sendResponse(result)).catch((err) => sendResponse({ ok: false, message: String(err?.message || err) || "\u4FDD\u5B58\u5931\u8D25\u3002" }));
      return true;
    }
    if (msg.type === "list-ima-notebooks") {
      (async () => {
        const data = await chrome.storage.local.get("settings");
        const settings = normalizeSettings(data.settings || {});
        const result = await imaRequest("openapi/note/v1/list_notebook", { cursor: "0", limit: 20 }, settings);
        const folders = (result?.NoteFolderInfo || result?.note_folder_infos || []).map((item) => ({
          id: item.folder_id,
          name: item.name,
          count: item.note_number
        }));
        return { ok: true, folders };
      })().then((result) => sendResponse(result)).catch((err) => sendResponse({ ok: false, message: err?.message || "\u83B7\u53D6\u7B14\u8BB0\u672C\u5217\u8868\u5931\u8D25\u3002" }));
      return true;
    }
    return false;
  });
  function safeFilenamePart(name) {
    return String(name || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  }
  async function saveToImaNote(msg) {
    const markdown = String(msg?.markdown || "");
    if (!markdown.trim()) return { ok: false, message: "\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u5185\u5BB9\u3002" };
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const term = safeFilenamePart(msg.term) || "\u672A\u547D\u540D";
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const downloadId = await chrome.downloads.download({
        url,
        filename: `\u79D2\u61C2\u7B14\u8BB0/${stamp} ${term}.md`,
        conflictAction: "uniquify",
        saveAs: false
      });
      return { ok: true, downloadId };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "huaci") return;
    const mine = /* @__PURE__ */ new Set();
    port.onMessage.addListener((msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "abort") {
        controllers.get(msg.requestId)?.abort();
        return;
      }
      if (msg.type === "start") startStream(port, msg, mine);
    });
    port.onDisconnect.addListener(() => {
      for (const id of mine) controllers.get(id)?.abort();
    });
  });
  async function startStream(port, msg, mine) {
    const requestId = msg.requestId;
    controllers.get(requestId)?.abort();
    const ctrl = new AbortController();
    controllers.set(requestId, ctrl);
    mine.add(requestId);
    const phase = msg.phase || "initial";
    const post = (payload) => {
      try {
        port.postMessage(payload);
      } catch {
        ctrl.abort();
      }
    };
    try {
      const settings = await readSettings();
      await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        messages: msg.messages,
        maxTokens: maxTokensForLength(settings.length),
        signal: ctrl.signal,
        onDelta: (text) => post({ type: "delta", requestId, phase, text })
      });
      post({ type: "done", requestId, phase });
    } catch (err) {
      if (err?.name === "AbortError") {
        post({ type: "aborted", requestId });
        return;
      }
      post({ type: "error", requestId, message: toUserError(err) || "\u89E3\u91CA\u5931\u8D25\u4E86\u3002" });
    } finally {
      mine.delete(requestId);
      if (controllers.get(requestId) === ctrl) controllers.delete(requestId);
    }
  }
})();
