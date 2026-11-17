import XCTest
@testable import Miaodong

final class DomainPersistenceTests: XCTestCase {
    private var temporaryDirectory: URL!

    override func setUpWithError() throws {
        temporaryDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("MiaodongTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: temporaryDirectory, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let temporaryDirectory {
            try? FileManager.default.removeItem(at: temporaryDirectory)
        }
        temporaryDirectory = nil
    }

    func testProviderPresetCatalogMatchesExtension() throws {
        XCTAssertEqual(ProviderPresets.all.count, 12)
        XCTAssertEqual(
            ProviderPresets.all.map(\.id),
            ["deepseek", "doubao", "qwen", "kimi", "zhipu", "minimax", "wenxin", "hunyuan", "spark", "stepfun", "openai", "custom"]
        )
        XCTAssertEqual(ProviderPresets.preset(for: "deepseek")?.model, "deepseek-chat")
        XCTAssertEqual(ProviderPresets.preset(for: "qwen")?.baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1")
        XCTAssertEqual(ProviderPresets.preset(for: "stepfun")?.model, "step-2-16k")
        XCTAssertEqual(ProviderPresets.preset(for: "openai")?.keyUrl, "https://platform.openai.com/api-keys")

        let doubao = try XCTUnwrap(ProviderPresets.preset(for: "doubao"))
        XCTAssertEqual(doubao.modelPlaceholder, "ep-xxxxxxxx")
        XCTAssertTrue(doubao.note.contains("推理接入点 ID"))
        XCTAssertEqual(ProviderPresets.preset(for: "custom")?.keyUrl, "")
    }

    func testBaseURLAPIKeyAndSettingsNormalization() {
        XCTAssertEqual(
            ProviderPresets.normalizeBaseURL(" api.example.com/v1/// "),
            "https://api.example.com/v1"
        )
        XCTAssertEqual(
            ProviderPresets.normalizeBaseURL("https://example.com/v1/chat/completions/"),
            "https://example.com/v1"
        )
        XCTAssertEqual(
            ProviderPresets.normalizeBaseURL("HTTPS://EXAMPLE.COM/V1/CHAT/COMPLETIONS"),
            "HTTPS://EXAMPLE.COM/V1"
        )
        XCTAssertEqual(ProviderPresets.normalizeBaseURL("   "), "")
        XCTAssertEqual(ProviderPresets.normalizeAPIKey(" \nBearer   sk-test\t"), "sk-test")
        XCTAssertEqual(ProviderPresets.normalizeAPIKey("Basic sk-test"), "Basic sk-test")

        var settings = AppSettings.default
        settings.provider = "unknown"
        settings.baseUrl = ""
        settings.model = "  model-name  "
        settings.excludedAppBundleIDs = [" com.example.app ", "com.example.app", ""]
        let normalized = ProviderPresets.normalized(settings)
        XCTAssertEqual(normalized.provider, "deepseek")
        XCTAssertEqual(normalized.baseUrl, "https://api.deepseek.com/v1")
        XCTAssertEqual(normalized.model, "model-name")
        XCTAssertEqual(normalized.excludedAppBundleIDs, ["com.example.app"])

        XCTAssertEqual(
            ProviderPresets.model(forPresetWithID: "doubao", currentModel: " ep-12345 "),
            "ep-12345"
        )
        XCTAssertEqual(
            ProviderPresets.model(forPresetWithID: "kimi", currentModel: "ep-12345"),
            "moonshot-v1-8k"
        )

        settings.provider = "custom"
        settings.baseUrl = ""
        settings.model = ""
        XCTAssertEqual(
            ProviderPresets.validationErrors(for: settings, requireKey: true),
            ["请填写 Base URL。", "请填写模型名。使用豆包时填写接入点 ID（ep- 开头）。", "请填写 API Key。"]
        )
    }

    func testSettingsStoreUsesInjectedDefaultsAndNeverStoresAPIKey() throws {
        let suiteName = "MiaodongTests.Settings.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = SettingsStore(defaults: defaults)
        var settings = AppSettings.default
        settings.provider = "kimi"
        settings.baseUrl = " api.moonshot.cn/v1/chat/completions/ "
        settings.model = " moonshot-v1-auto "
        try store.save(settings)

        XCTAssertEqual(store.load().baseUrl, "https://api.moonshot.cn/v1")
        XCTAssertEqual(store.load().model, "moonshot-v1-auto")
        let archived = try XCTUnwrap(defaults.data(forKey: SettingsStore.defaultStorageKey))
        let archivedText = String(decoding: archived, as: UTF8.self)
        XCTAssertFalse(archivedText.contains("apiKey"))
        XCTAssertFalse(archivedText.contains("sk-test-secret"))
    }

    func testSelectionOnlyPromptDoesNotInventParagraphContext() {
        let fullSelection = String(repeating: "汉", count: 700)
        let context = SelectionContext(
            selectionFull: fullSelection,
            paragraph: "不能冒充段落的文字",
            before: "不能冒充前文的文字",
            after: "不能冒充后文的文字",
            sourceAppName: "文本编辑",
            sourceBundleID: "com.apple.TextEdit",
            windowTitle: "示例窗口",
            url: "https://example.com/article",
            quality: .axSelectionOnly,
            anchor: SelectionAnchor(x: 100, y: 200)
        )
        var settings = AppSettings.default
        settings.outputLanguage = .en
        settings.length = .detailed

        let messages = PromptBuilder.initialMessages(for: context, settings: settings)
        XCTAssertEqual(messages.count, 2)
        XCTAssertEqual(messages[0].role, .system)
        XCTAssertTrue(messages[0].content.contains("【释义】\n【语境】\n【延伸】\n【翻译】"))
        XCTAssertTrue(messages[0].content.contains("Write the body of each section in English"))
        XCTAssertTrue(messages[0].content.contains("【语境】四到六句"))
        XCTAssertTrue(messages[0].content.contains("没有周围文本"))
        XCTAssertEqual(settings.length.maxTokens, 1200)

        let user = messages[1].content
        XCTAssertTrue(user.contains("窗口标题：示例窗口"))
        XCTAssertTrue(user.contains("来源应用：文本编辑"))
        XCTAssertTrue(user.contains("来源 Bundle ID：com.apple.TextEdit"))
        XCTAssertTrue(user.contains("链接：https://example.com/article"))
        XCTAssertTrue(user.contains("没有周围文本"))
        XCTAssertTrue(user.contains("中文为主"))
        XCTAssertTrue(user.contains("（选中文字过长，这里只保留了前段。）"))
        XCTAssertFalse(user.contains("不能冒充段落"))
        XCTAssertFalse(user.contains("不能冒充前文"))
        XCTAssertFalse(user.contains("不能冒充后文"))
        XCTAssertTrue(user.contains(String(repeating: "汉", count: 600)))
        XCTAssertFalse(user.contains(String(repeating: "汉", count: 601)))

        let emptyParagraph = SelectionContext(selectionFull: "术语", quality: .axParagraph)
        let degraded = PromptBuilder.initialMessages(for: emptyParagraph, settings: .default)
        XCTAssertTrue(degraded[1].content.contains("辅助功能仅选区（未取得段落）"))
        XCTAssertTrue(degraded[1].content.contains("没有周围文本"))
    }

    func testParagraphAndClipboardPromptsKeepContextSemantics() {
        let paragraphContext = SelectionContext(
            selectionFull: "entropy",
            paragraph: "Entropy has a specific meaning in this paragraph.",
            before: "Previous sentence",
            after: "Next sentence",
            sourceAppName: "Preview",
            quality: .axParagraph
        )
        let initial = PromptBuilder.initialMessages(for: paragraphContext, settings: .default)
        XCTAssertTrue(initial[1].content.contains("Entropy has a specific meaning"))
        XCTAssertTrue(initial[1].content.contains("Previous sentence"))
        XCTAssertFalse(initial[1].content.contains("没有周围文本"))

        let elaborated = PromptBuilder.followUpMessages(
            priorTurns: initial + [ChatMessage(role: .assistant, content: "Initial answer")],
            context: paragraphContext,
            settings: .default,
            kind: .elaborate
        )
        XCTAssertEqual(elaborated.count, 4)
        XCTAssertTrue(elaborated.last?.content.contains("补上这个说法的边界") == true)
        XCTAssertTrue(elaborated.last?.content.contains("它所在的段落") == true)

        let clipboardContext = SelectionContext(
            selectionFull: "entropy",
            paragraph: "不应出现的段落",
            sourceAppName: "Terminal",
            quality: .clipboard
        )
        let clipboardInitial = PromptBuilder.initialMessages(for: clipboardContext, settings: .default)
        let followUps = PromptBuilder.followUpMessages(
            priorTurns: clipboardInitial + [ChatMessage(role: .assistant, content: "Initial answer")],
            context: clipboardContext,
            settings: .default,
            kind: .question,
            question: "  为什么？  "
        )
        let prompt = followUps.last?.content ?? ""
        XCTAssertTrue(prompt.contains("读者的追问：为什么？"))
        XCTAssertTrue(prompt.contains("复制文字"))
        XCTAssertTrue(prompt.contains("没有周围文本"))
        XCTAssertFalse(prompt.contains("它所在的段落"))
        XCTAssertFalse(clipboardInitial[1].content.contains("不应出现的段落"))
    }

    func testScriptDetectionAndTokenLimits() {
        XCTAssertEqual(PromptBuilder.detectScript("这是中文"), .zh)
        XCTAssertEqual(PromptBuilder.detectScript("mostly English"), .en)
        XCTAssertEqual(PromptBuilder.detectScript("中文 English"), .mixed)
        XCTAssertEqual(PromptBuilder.detectScript("これは日本語です"), .ja)
        XCTAssertEqual(PromptBuilder.detectScript("∑ = 42"), .other)
        XCTAssertEqual(ExplanationLength.brief.maxTokens, 360)
        XCTAssertEqual(ExplanationLength.standard.maxTokens, 700)
        XCTAssertEqual(ExplanationLength.detailed.maxTokens, 1200)
    }

    func testHistoryDeduplicatesByTermAndSourceWithin120Seconds() throws {
        let store = makeHistoryStore()
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let original = makeEntry(term: "术语", explanation: "旧解释", createdAt: start)
        try store.save(original)
        try store.save(makeEntry(
            term: "术语",
            explanation: "另一个来源",
            sourceBundleID: "com.example.other",
            createdAt: start
        ))

        let replacement = makeEntry(term: "术语", explanation: "新解释", createdAt: start.addingTimeInterval(60))
        try store.save(replacement)
        var entries = try store.load()
        XCTAssertEqual(entries.count, 2)
        XCTAssertEqual(entries.first?.id, replacement.id)
        XCTAssertFalse(entries.contains { $0.id == original.id })
        XCTAssertTrue(entries.contains { $0.explanation == "另一个来源" })

        try store.save(makeEntry(
            term: "术语",
            explanation: "超过去重窗口",
            createdAt: start.addingTimeInterval(181)
        ))
        entries = try store.load()
        XCTAssertEqual(entries.count, 3)
    }

    func testHistorySameIDUpdatesSingleEntry() throws {
        let store = makeHistoryStore()
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        let id = UUID()
        try store.save(makeEntry(id: id, term: "术语", explanation: "初稿", createdAt: start))
        try store.save(makeEntry(term: "其他", createdAt: start.addingTimeInterval(1)))
        try store.save(makeEntry(
            id: id,
            term: "术语",
            explanation: "追问后的完整解释",
            createdAt: start.addingTimeInterval(2)
        ))

        let entries = try store.load()
        XCTAssertEqual(entries.count, 2)
        XCTAssertEqual(entries.first?.id, id)
        XCTAssertEqual(entries.first?.explanation, "追问后的完整解释")
        XCTAssertEqual(entries.filter { $0.id == id }.count, 1)
    }

    func testHistoryKeepsOnlyMostRecent100Entries() throws {
        let store = makeHistoryStore()
        let start = Date(timeIntervalSince1970: 1_700_000_000)
        for index in 0..<105 {
            try store.save(makeEntry(
                term: "术语-\(index)",
                createdAt: start.addingTimeInterval(TimeInterval(index))
            ))
        }

        let entries = try store.load()
        XCTAssertEqual(entries.count, 100)
        XCTAssertEqual(entries.first?.term, "术语-104")
        XCTAssertEqual(entries.last?.term, "术语-5")
    }

    func testHistoryExportsAndClearWithoutAPIKey() throws {
        let store = makeHistoryStore()
        let secret = "sk-test-secret-that-must-not-be-stored"
        var entry = makeEntry(
            term: "密钥",
            explanation: "【释义】解释内容",
            createdAt: Date(timeIntervalSince1970: 1_700_000_000)
        )
        entry.sourceAppName = "文本编辑"
        entry.windowTitle = "窗口"
        entry.followUps = [FollowUp(question: "再详细一点", answer: "补充回答")]
        try store.save(entry)

        let json = try store.exportJSON()
        let markdown = try store.exportMarkdown()
        let storedData = try Data(contentsOf: store.fileURL)
        for output in [json, markdown, String(decoding: storedData, as: UTF8.self)] {
            XCTAssertFalse(output.contains(secret))
            XCTAssertFalse(output.contains("apiKey"))
        }
        XCTAssertTrue(json.contains("\"followUps\""))
        XCTAssertTrue(markdown.contains("# 秒懂记录"))
        XCTAssertTrue(markdown.contains("来源应用：文本编辑"))
        XCTAssertTrue(markdown.contains("问：再详细一点"))

        try store.clear()
        XCTAssertEqual(try store.load(), [])
        let emptyJSON = try store.exportJSON()
        let decoded = try JSONSerialization.jsonObject(with: Data(emptyJSON.utf8)) as? [Any]
        XCTAssertEqual(decoded?.count, 0)
    }

    private func makeHistoryStore() -> HistoryStore {
        HistoryStore(fileURL: temporaryDirectory.appendingPathComponent("history.json"))
    }

    private func makeEntry(
        id: UUID = UUID(),
        term: String,
        explanation: String = "解释",
        sourceBundleID: String = "com.example.source",
        createdAt: Date
    ) -> HistoryEntry {
        HistoryEntry(
            id: id,
            term: term,
            explanation: explanation,
            sourceAppName: "Source App",
            sourceBundleID: sourceBundleID,
            url: "https://example.com/source",
            createdAt: createdAt
        )
    }
}
