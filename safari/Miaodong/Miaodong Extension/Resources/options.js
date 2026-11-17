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
  function historyToMarkdown(items) {
    const lines = ["# \u79D2\u61C2\u8BB0\u5F55", ""];
    for (const item of items || []) {
      lines.push(`## ${item.term || "\uFF08\u65E0\u9009\u533A\uFF09"}`);
      lines.push("");
      lines.push(`- \u65F6\u95F4\uFF1A${formatStamp(item.createdAt || Date.now())}`);
      if (item.title) lines.push(`- \u9875\u9762\uFF1A${item.title}`);
      if (item.url) lines.push(`- \u94FE\u63A5\uFF1A${item.url}`);
      lines.push("");
      lines.push(item.explanation || "");
      lines.push("");
    }
    return lines.join("\n");
  }
  function historyToJson(items) {
    return JSON.stringify(items || [], null, 2);
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
    const provider2 = PRESETS[raw.provider] ? raw.provider : DEFAULT_SETTINGS.provider;
    const language2 = LANGUAGES.some((item) => item.id === raw.outputLanguage) ? raw.outputLanguage : DEFAULT_SETTINGS.outputLanguage;
    const length2 = LENGTHS.some((item) => item.id === raw.length) ? raw.length : DEFAULT_SETTINGS.length;
    const triggerMode = raw.triggerMode === "immediate" ? "immediate" : "icon";
    return {
      enabled: raw.enabled !== false,
      provider: provider2,
      baseUrl: normalizeBaseUrl(raw.baseUrl || PRESETS[provider2].baseUrl || ""),
      apiKey: normalizeApiKey(raw.apiKey),
      model: String(raw.model ?? PRESETS[provider2].model ?? "").trim(),
      outputLanguage: language2,
      length: length2,
      triggerMode,
      blacklist: typeof raw.blacklist === "string" ? raw.blacklist : "",
      imaClientId: String(raw.imaClientId ?? "").trim(),
      imaApiKey: String(raw.imaApiKey ?? "").trim(),
      imaFolderId: String(raw.imaFolderId ?? "").trim(),
      imaFolderName: String(raw.imaFolderName ?? "").trim()
    };
  }
  function validateSettings(settings, { requireKey = false } = {}) {
    const errors = [];
    if (!settings.baseUrl) errors.push("\u8BF7\u586B\u5199 Base URL\u3002");
    else if (!/^https?:\/\/.+/i.test(settings.baseUrl)) errors.push("Base URL \u9700\u8981\u662F http \u6216 https \u5730\u5740\u3002");
    if (!settings.model) errors.push("\u8BF7\u586B\u5199\u6A21\u578B\u540D\u3002\u4F7F\u7528\u8C46\u5305\u65F6\u586B\u5199\u63A5\u5165\u70B9 ID\uFF08ep- \u5F00\u5934\uFF09\u3002");
    if (requireKey && !settings.apiKey) errors.push("\u8BF7\u586B\u5199 API Key\u3002");
    return errors;
  }

  // src/options/options.js
  var provider = document.querySelector("#provider");
  var baseUrl = document.querySelector("#baseUrl");
  var apiKey = document.querySelector("#apiKey");
  var model = document.querySelector("#model");
  var note = document.querySelector("#note");
  var keyLink = document.querySelector("#keyLink");
  var language = document.querySelector("#language");
  var length = document.querySelector("#length");
  var enabled = document.querySelector("#enabled");
  var blacklist = document.querySelector("#blacklist");
  var status = document.querySelector("#status");
  var historyEl = document.querySelector("#history");
  var imaClientId = document.querySelector("#imaClientId");
  var imaApiKey = document.querySelector("#imaApiKey");
  var imaFolder = document.querySelector("#imaFolder");
  var imaStatus = document.querySelector("#imaStatus");
  var imaKeySaved = false;
  var clearKey = false;
  for (const preset of Object.values(PRESETS)) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    provider.append(option);
  }
  for (const item of LANGUAGES) language.append(new Option(item.label, item.id));
  for (const item of LENGTHS) length.append(new Option(item.label, item.id));
  provider.addEventListener("change", () => applyPreset(provider.value));
  document.querySelector("#toggleKey").addEventListener("click", () => {
    const show = apiKey.type === "password";
    apiKey.type = show ? "text" : "password";
    document.querySelector("#toggleKey").textContent = show ? "\u9690\u85CF" : "\u663E\u793A";
  });
  document.querySelector("#toggleImaKey").addEventListener("click", () => {
    const show = imaApiKey.type === "password";
    imaApiKey.type = show ? "text" : "password";
    document.querySelector("#toggleImaKey").textContent = show ? "\u9690\u85CF" : "\u663E\u793A";
  });
  document.querySelector("#refreshImaFolders").addEventListener("click", () => refreshImaFolders().catch((err) => setImaStatus(err.message, "bad")));
  document.querySelector("#clearKey").addEventListener("click", () => {
    clearKey = true;
    apiKey.value = "";
    apiKey.placeholder = "\u5DF2\u6807\u8BB0\u6E05\u9664\uFF0C\u4FDD\u5B58\u540E\u751F\u6548";
    setStatus("\u5BC6\u94A5\u4F1A\u5728\u4FDD\u5B58\u65F6\u6E05\u6389\u3002", "");
  });
  document.querySelector("#save").addEventListener("click", () => save().catch((err) => setStatus(err.message, "bad")));
  document.querySelector("#test").addEventListener("click", () => test().catch((err) => setStatus(err.message, "bad")));
  document.querySelector("#exportMd").addEventListener("click", () => exportHistory("md"));
  document.querySelector("#exportJson").addEventListener("click", () => exportHistory("json"));
  document.querySelector("#clearHistory").addEventListener("click", async () => {
    const data = await chrome.storage.local.get("history");
    if (!data.history?.length) return;
    if (!confirm("\u6E05\u7A7A\u8FD9\u53F0\u6D4F\u89C8\u5668\u4E0A\u7684\u79D2\u61C2\u8BB0\u5F55\uFF1F")) return;
    await chrome.storage.local.set({ history: [] });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.history) renderHistory(changes.history.newValue || []);
  });
  load();
  async function load() {
    const data = await chrome.storage.local.get(["settings", "history"]);
    const settings = normalizeSettings(data.settings || DEFAULT_SETTINGS);
    provider.value = settings.provider;
    baseUrl.value = settings.baseUrl;
    model.value = settings.model;
    language.value = settings.outputLanguage;
    length.value = settings.length;
    enabled.checked = settings.enabled;
    blacklist.value = settings.blacklist;
    const trigger = document.querySelector(`input[name="trigger"][value="${settings.triggerMode}"]`);
    if (trigger) trigger.checked = true;
    apiKey.value = "";
    clearKey = false;
    apiKey.placeholder = settings.apiKey ? "\u5DF2\u4FDD\u5B58\uFF0C\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539" : "sk-\u2026";
    imaClientId.value = settings.imaClientId;
    imaKeySaved = Boolean(settings.imaApiKey);
    imaApiKey.value = "";
    imaApiKey.placeholder = imaKeySaved ? "\u5DF2\u4FDD\u5B58\uFF0C\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539" : "ima \u5F00\u653E\u63A5\u53E3\u9875\u83B7\u53D6";
    imaFolder.value = settings.imaFolderId;
    if (settings.imaFolderId && settings.imaFolderName) {
      imaFolder.append(new Option(settings.imaFolderName, settings.imaFolderId));
      imaFolder.value = settings.imaFolderId;
    }
    if (settings.imaClientId && imaKeySaved) {
      refreshImaFolders().catch(() => setImaStatus("\u7B14\u8BB0\u672C\u5217\u8868\u6CA1\u62C9\u53D6\u5230\uFF0C\u53EF\u70B9\u300C\u5237\u65B0\u5217\u8868\u300D\u91CD\u8BD5\u3002", "bad"));
    }
    showPresetNote(settings.provider);
    renderHistory(data.history || []);
  }
  function applyPreset(id) {
    const preset = PRESETS[id];
    if (!preset) return;
    baseUrl.value = preset.baseUrl;
    const current = model.value.trim();
    if (!(id === "doubao" && current.startsWith("ep-"))) model.value = preset.model;
    showPresetNote(id);
  }
  function showPresetNote(id) {
    const preset = PRESETS[id] || PRESETS.custom;
    note.textContent = preset.note || "";
    model.placeholder = preset.modelPlaceholder || "\u6A21\u578B\u540D";
    if (preset.keyUrl) {
      keyLink.hidden = false;
      keyLink.href = preset.keyUrl;
      keyLink.textContent = `\u6253\u5F00${preset.label}\u7684\u5BC6\u94A5\u9875`;
    } else {
      keyLink.hidden = true;
    }
  }
  async function gather() {
    const data = await chrome.storage.local.get("settings");
    const existing = data.settings || {};
    const typed = apiKey.value.trim();
    let key = existing.apiKey || "";
    if (typed) key = normalizeApiKey(typed);
    else if (clearKey) key = "";
    const imaTyped = imaApiKey.value.trim();
    let imaKey = existing.imaApiKey || "";
    if (imaTyped) imaKey = imaTyped;
    else if (imaClientId.value.trim() !== (existing.imaClientId || "") && !imaClientId.value.trim()) imaKey = "";
    const folderId = imaFolder.value;
    const folderOption = folderId ? imaFolder.selectedOptions[0] : null;
    return normalizeSettings({
      enabled: enabled.checked,
      provider: provider.value,
      baseUrl: baseUrl.value,
      apiKey: key,
      model: model.value,
      outputLanguage: language.value,
      length: length.value,
      triggerMode: document.querySelector('input[name="trigger"]:checked')?.value || "icon",
      blacklist: blacklist.value,
      imaClientId: imaClientId.value.trim(),
      imaApiKey: imaKey,
      imaFolderId: folderId,
      imaFolderName: folderOption?.textContent || ""
    });
  }
  async function save() {
    const settings = await gather();
    const errors = validateSettings(settings);
    await chrome.storage.local.set({ settings });
    clearKey = false;
    apiKey.value = "";
    apiKey.placeholder = settings.apiKey ? "\u5DF2\u4FDD\u5B58\uFF0C\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539" : "sk-\u2026";
    imaKeySaved = Boolean(settings.imaApiKey);
    imaApiKey.value = "";
    imaApiKey.placeholder = imaKeySaved ? "\u5DF2\u4FDD\u5B58\uFF0C\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539" : "ima \u5F00\u653E\u63A5\u53E3\u9875\u83B7\u53D6";
    if (errors.length) setStatus(`\u5DF2\u4FDD\u5B58\u3002${errors.join("")}`, "bad");
    else setStatus("\u5DF2\u4FDD\u5B58\u3002", "ok");
    return settings;
  }
  async function test() {
    setStatus("\u6B63\u5728\u4FDD\u5B58\u5E76\u6D4B\u8BD5\u2026", "");
    const settings = await save();
    const errors = validateSettings(settings, { requireKey: true });
    if (errors.length) {
      setStatus(errors.join(""), "bad");
      return;
    }
    const result = await chrome.runtime.sendMessage({ type: "test-connection" });
    setStatus(result?.message || "\u6CA1\u6709\u54CD\u5E94\u3002", result?.ok ? "ok" : "bad");
  }
  function setStatus(text, kind) {
    status.textContent = text;
    status.className = `status ${kind || ""}`.trim();
  }
  function setImaStatus(text, kind) {
    imaStatus.textContent = text;
    imaStatus.className = `status ${kind || ""}`.trim();
  }
  async function refreshImaFolders() {
    setImaStatus("\u6B63\u5728\u62C9\u53D6\u7B14\u8BB0\u672C\u5217\u8868\u2026", "");
    await save();
    const result = await chrome.runtime.sendMessage({ type: "list-ima-notebooks" });
    if (!result?.ok) {
      setImaStatus(result?.message || "\u62C9\u53D6\u5931\u8D25\uFF0C\u68C0\u67E5\u51ED\u8BC1\u3002", "bad");
      return;
    }
    const current = imaFolder.value;
    imaFolder.replaceChildren(new Option("\u9ED8\u8BA4\u4F4D\u7F6E", ""));
    for (const folder of result.folders || []) {
      imaFolder.append(new Option(`${folder.name}\uFF08${folder.count ?? 0}\u7BC7\uFF09`, folder.id));
    }
    if (current && [...imaFolder.options].some((option) => option.value === current)) imaFolder.value = current;
    setImaStatus(`\u5DF2\u62C9\u53D6 ${(result.folders || []).length} \u4E2A\u7B14\u8BB0\u672C\u3002`, "ok");
  }
  async function exportHistory(kind) {
    const data = await chrome.storage.local.get("history");
    const items = data.history || [];
    if (!items.length) {
      setStatus("\u8FD8\u6CA1\u6709\u53EF\u4EE5\u5BFC\u51FA\u7684\u8BB0\u5F55\u3002", "bad");
      return;
    }
    if (kind === "json") download("\u79D2\u61C2.json", historyToJson(items), "application/json");
    else download("\u79D2\u61C2.md", `\uFEFF${historyToMarkdown(items)}`, "text/markdown");
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function renderHistory(items) {
    historyEl.replaceChildren();
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u3002\u89E3\u91CA\u4F1A\u7559\u5728\u8FD9\u53F0\u6D4F\u89C8\u5668\u91CC\u3002";
      historyEl.append(p);
      return;
    }
    for (const item of items) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const term = document.createElement("span");
      term.className = "term";
      term.textContent = item.term || "\uFF08\u65E0\u9009\u533A\uFF09";
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = [formatRelative(item.createdAt), item.title].filter(Boolean).join(" \xB7 ");
      summary.append(term, meta);
      const body = document.createElement("pre");
      body.textContent = item.explanation || "";
      details.append(summary, body);
      historyEl.append(details);
    }
  }
})();
