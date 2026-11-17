import Foundation

struct ProviderPreset: Equatable, Identifiable {
    let id: String
    let label: String
    let baseUrl: String
    let model: String
    let modelPlaceholder: String
    let keyUrl: String
    let note: String

    init(
        id: String,
        label: String,
        baseUrl: String,
        model: String,
        modelPlaceholder: String = "",
        keyUrl: String = "",
        note: String
    ) {
        self.id = id
        self.label = label
        self.baseUrl = baseUrl
        self.model = model
        self.modelPlaceholder = modelPlaceholder
        self.keyUrl = keyUrl
        self.note = note
    }
}

enum ProviderPresets {
    static let all: [ProviderPreset] = [
        ProviderPreset(
            id: "deepseek",
            label: "DeepSeek",
            baseUrl: "https://api.deepseek.com/v1",
            model: "deepseek-chat",
            keyUrl: "https://platform.deepseek.com/api_keys",
            note: "模型一般用 deepseek-chat。Key 在 platform.deepseek.com 创建。"
        ),
        ProviderPreset(
            id: "doubao",
            label: "豆包 · 火山方舟",
            baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
            model: "",
            modelPlaceholder: "ep-xxxxxxxx",
            keyUrl: "https://console.volcengine.com/ark",
            note: "模型一栏填方舟的推理接入点 ID（ep- 开头），不是控制台上的展示名。Key 在方舟「API Key 管理」里创建。"
        ),
        ProviderPreset(
            id: "qwen",
            label: "通义千问",
            baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            model: "qwen-plus",
            keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
            note: "兼容模式的 Base URL 要带 /compatible-mode/v1。模型可用 qwen-plus、qwen-turbo。"
        ),
        ProviderPreset(
            id: "kimi",
            label: "Kimi",
            baseUrl: "https://api.moonshot.cn/v1",
            model: "moonshot-v1-8k",
            keyUrl: "https://platform.moonshot.cn/console/api-keys",
            note: "模型可用 moonshot-v1-8k 或 moonshot-v1-auto。"
        ),
        ProviderPreset(
            id: "zhipu",
            label: "智谱 GLM",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "glm-4-flash",
            keyUrl: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
            note: "模型可用 glm-4-flash、glm-4-air、glm-4-plus，以账号权限为准。"
        ),
        ProviderPreset(
            id: "minimax",
            label: "MiniMax",
            baseUrl: "https://api.minimaxi.com/v1",
            model: "MiniMax-M2",
            keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
            note: "模型可用 MiniMax-M2、MiniMax-Text-01，以控制台为准。"
        ),
        ProviderPreset(
            id: "wenxin",
            label: "文心 · 百度千帆",
            baseUrl: "https://qianfan.baidubce.com/v2",
            model: "ernie-4.0-8k",
            keyUrl: "https://console.bce.baidu.com/qianfan/ais/console/apiKey",
            note: "使用千帆 ModelBuilder 的 API Key；模型可用 ernie-4.0-8k、ernie-speed-128k，以控制台为准。"
        ),
        ProviderPreset(
            id: "hunyuan",
            label: "腾讯混元",
            baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
            model: "hunyuan-turbo",
            keyUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
            note: "模型可用 hunyuan-turbo、hunyuan-lite、hunyuan-standard，以控制台为准。"
        ),
        ProviderPreset(
            id: "spark",
            label: "讯飞星火",
            baseUrl: "https://spark-api-open.xf-yun.com/v1",
            model: "generalv3.5",
            keyUrl: "https://console.xfyun.cn/",
            note: "模型可用 lite、generalv3、generalv3.5、4.0Ultra；API Key 填控制台对应应用的 APIPassword。"
        ),
        ProviderPreset(
            id: "stepfun",
            label: "阶跃星辰",
            baseUrl: "https://api.stepfun.com/v1",
            model: "step-2-16k",
            keyUrl: "https://platform.stepfun.com/interface-key",
            note: "模型可用 step-2-16k、step-1-8k，以控制台为准。"
        ),
        ProviderPreset(
            id: "openai",
            label: "OpenAI",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            keyUrl: "https://platform.openai.com/api-keys",
            note: "模型名按账号情况填写，例如 gpt-4o-mini。"
        ),
        ProviderPreset(
            id: "custom",
            label: "自定义",
            baseUrl: "",
            model: "",
            note: "任何 OpenAI 兼容接口：向 {Base URL}/chat/completions 发 POST，Bearer 鉴权，并支持 stream。"
        )
    ]

    private static let byID = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    static func preset(for id: String) -> ProviderPreset? {
        byID[id]
    }

    static func normalizeBaseURL(_ input: String?) -> String {
        var url = (input ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if url.isEmpty { return "" }
        if !hasHTTPScheme(url) {
            url = "https://\(url)"
        }
        url = replacing(pattern: "/+$", in: url, with: "")
        url = replacing(pattern: "/chat/completions$", in: url, with: "")
        url = replacing(pattern: "/+$", in: url, with: "")
        return hasHTTPScheme(url) ? url : ""
    }

    static func normalizeAPIKey(_ input: String?) -> String {
        let key = (input ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return replacing(pattern: "^Bearer\\s+", in: key, with: "")
    }

    static func normalized(_ settings: AppSettings) -> AppSettings {
        let preset = preset(for: settings.provider) ?? all[0]
        var result = settings
        result.provider = preset.id
        result.baseUrl = normalizeBaseURL(settings.baseUrl.isEmpty ? preset.baseUrl : settings.baseUrl)
        result.model = settings.model.trimmingCharacters(in: .whitespacesAndNewlines)

        var seen = Set<String>()
        result.excludedAppBundleIDs = settings.excludedAppBundleIDs.compactMap { rawID in
            let id = rawID.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !id.isEmpty, seen.insert(id).inserted else { return nil }
            return id
        }
        return result
    }

    static func validationErrors(
        for settings: AppSettings,
        apiKey: String = "",
        requireKey: Bool = false
    ) -> [String] {
        let settings = normalized(settings)
        var errors: [String] = []
        if settings.baseUrl.isEmpty {
            errors.append("请填写 Base URL。")
        } else if !hasHTTPScheme(settings.baseUrl) {
            errors.append("Base URL 需要是 http 或 https 地址。")
        }
        if settings.model.isEmpty {
            errors.append("请填写模型名。使用豆包时填写接入点 ID（ep- 开头）。")
        }
        if requireKey && normalizeAPIKey(apiKey).isEmpty {
            errors.append("请填写 API Key。")
        }
        return errors
    }

    static func model(forPresetWithID id: String, currentModel: String) -> String {
        guard let preset = preset(for: id) else { return currentModel }
        let current = currentModel.trimmingCharacters(in: .whitespacesAndNewlines)
        if id == "doubao", current.hasPrefix("ep-") {
            return current
        }
        return preset.model
    }

    private static func hasHTTPScheme(_ value: String) -> Bool {
        value.range(
            of: "^https?://",
            options: [.regularExpression, .caseInsensitive]
        ) != nil
    }

    private static func replacing(pattern: String, in value: String, with replacement: String) -> String {
        value.replacingOccurrences(
            of: pattern,
            with: replacement,
            options: [.regularExpression, .caseInsensitive]
        )
    }
}
