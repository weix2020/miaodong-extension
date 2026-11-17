(() => {
  // src/shared/history.js
  function formatStamp(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function formatRelative(ts, now = Date.now()) {
    const diff = Math.max(0, now - ts);
    if (diff < 6e4) return "\u521A\u521A";
    if (diff < 36e5) return `${Math.floor(diff / 6e4)} \u5206\u949F\u524D`;
    if (diff < 864e5) return `${Math.floor(diff / 36e5)} \u5C0F\u65F6\u524D`;
    return formatStamp(ts);
  }

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

  // src/popup/popup.js
  var enabled = document.querySelector("#enabled");
  var historyEl = document.querySelector("#history");
  var subtitle = document.querySelector("#subtitle");
  document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  enabled.addEventListener("change", async () => {
    const data = await chrome.storage.local.get("settings");
    const settings = normalizeSettings(data.settings || {});
    settings.enabled = enabled.checked;
    await chrome.storage.local.set({ settings });
    subtitle.textContent = settings.enabled ? "\u5212\u4E00\u4E0B\uFF0C\u79D2\u61C2" : "\u5DF2\u6682\u505C\u3002\u7F51\u9875\u4E0A\u4E0D\u4F1A\u518D\u5F39\u51FA\u3002";
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.history) render(changes.history.newValue || []);
  });
  load();
  async function load() {
    const data = await chrome.storage.local.get(["settings", "history"]);
    const settings = normalizeSettings(data.settings || {});
    enabled.checked = settings.enabled;
    if (!settings.apiKey) subtitle.textContent = "\u8FD8\u6CA1\u6709 API Key\u3002\u5148\u5230\u8BBE\u7F6E\u91CC\u586B\u4E00\u4E2A\u3002";
    else if (!settings.enabled) subtitle.textContent = "\u5DF2\u6682\u505C\u3002\u7F51\u9875\u4E0A\u4E0D\u4F1A\u518D\u5F39\u51FA\u3002";
    else subtitle.textContent = "\u5212\u4E00\u4E0B\uFF0C\u79D2\u61C2";
    render(data.history || []);
  }
  function render(items) {
    historyEl.replaceChildren();
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u3002";
      historyEl.append(p);
      return;
    }
    for (const item of items.slice(0, 5)) {
      const row = document.createElement("div");
      row.className = "item";
      const term = document.createElement("strong");
      term.textContent = item.term || "\uFF08\u65E0\u9009\u533A\uFF09";
      const meta = document.createElement("span");
      meta.textContent = formatRelative(item.createdAt);
      row.append(term, meta);
      historyEl.append(row);
    }
  }
})();
