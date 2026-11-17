import AppKit
import SwiftUI

private struct ApplicationChoice: Identifiable {
    let id: String
    let name: String
    let icon: NSImage?
}

private enum HistoryExportFormat {
    case json
    case markdown

    var fileExtension: String {
        switch self {
        case .json: "json"
        case .markdown: "md"
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject private var model: AppState
    @State private var draft = AppSettings.default
    @State private var apiKey = ""
    @State private var clearAPIKey = false
    @State private var testing = false
    @State private var notice: String?
    @State private var noticeIsError = false
    @State private var applications: [ApplicationChoice] = []
    @State private var confirmingClear = false

    var body: some View {
        VStack(spacing: 0) {
            TabView {
                generalTab
                    .tabItem { Label("通用", systemImage: "gearshape") }
                providerTab
                    .tabItem { Label("接口", systemImage: "network") }
                explanationTab
                    .tabItem { Label("解释", systemImage: "text.book.closed") }
                applicationsTab
                    .tabItem { Label("停用应用", systemImage: "app.badge.checkmark") }
                historyTab
                    .tabItem { Label("历史", systemImage: "clock.arrow.circlepath") }
            }
            Divider()
            HStack(spacing: 10) {
                if let notice {
                    Text(notice)
                        .font(.caption)
                        .foregroundStyle(noticeIsError ? .red : .secondary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Button("保存设置", action: save)
                    .keyboardShortcut("s", modifiers: [.command])
                    .buttonStyle(.borderedProminent)
            }
            .padding(12)
        }
        .frame(width: 680, height: 620)
        .onAppear {
            draft = model.settings
            apiKey = ""
            clearAPIKey = false
            loadApplications()
            model.refreshAccessibilityPermission()
        }
        .confirmationDialog(
            "确定清空全部历史记录？此操作不能撤销。",
            isPresented: $confirmingClear,
            titleVisibility: .visible
        ) {
            Button("清空", role: .destructive) {
                do {
                    try model.clearHistory()
                    showNotice("历史记录已清空。")
                } catch {
                    showNotice(error.localizedDescription, isError: true)
                }
            }
            Button("取消", role: .cancel) {}
        }
    }

    private var generalTab: some View {
        Form {
            Section {
                Toggle("划词后显示「懂」", isOn: $draft.enabled)
                Text("保存后生效。关闭划词不会影响菜单栏的“解释已复制文字”。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("辅助功能") {
                HStack {
                    Label(
                        model.accessibilityGranted ? "已授权，可以读取其他应用的选区" : "尚未授权",
                        systemImage: model.accessibilityGranted ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
                    )
                    .foregroundStyle(model.accessibilityGranted ? .green : .orange)
                    Spacer()
                    if !model.accessibilityGranted {
                        Button("请求授权", action: model.requestAccessibilityPermission)
                    }
                    Button("刷新", action: model.refreshAccessibilityPermission)
                }
                Text("秒懂仅在拖选或双击后读取一次选区及可获得的附近文本。不会读取密码字段，不监听键盘，也不自动复制。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("隐私与发送时机") {
                Text("划词只显示「懂」，不会请求模型。只有点击「懂」后，才会把选中文字、实际取得的上下文和来源信息发送给当前配置的服务商。")
                Text("AX 不支持段落时，会明确降级为“仅选中文字”，不会编造上下文。菜单栏的剪贴板命令也只在你主动点击时读取纯文本。")
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    private var providerTab: some View {
        Form {
            Section("服务商") {
                Picker("接口", selection: $draft.provider) {
                    ForEach(ProviderPresets.all) { preset in
                        Text(preset.label).tag(preset.id)
                    }
                }
                .onChange(of: draft.provider) {
                    guard let preset = ProviderPresets.preset(for: draft.provider) else { return }
                    draft.baseUrl = preset.baseUrl
                    draft.model = ProviderPresets.model(
                        forPresetWithID: draft.provider,
                        currentModel: draft.model
                    )
                }
                Text(currentPreset.note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("OpenAI 兼容配置") {
                TextField("Base URL", text: $draft.baseUrl)
                    .font(.system(.body, design: .monospaced))
                SecureField(
                    model.hasStoredAPIKey ? "API Key（已保存，留空不修改）" : "API Key",
                    text: $apiKey
                )
                .disabled(clearAPIKey)
                if model.hasStoredAPIKey || clearAPIKey {
                    Toggle("明确清除已保存的 API Key", isOn: $clearAPIKey)
                        .onChange(of: clearAPIKey) {
                            if clearAPIKey { apiKey = "" }
                        }
                }
                TextField("模型名", text: $draft.model, prompt: Text(modelPlaceholder))
                HStack {
                    if let url = URL(string: currentPreset.keyUrl), !currentPreset.keyUrl.isEmpty {
                        Link("获取 API Key", destination: url)
                    }
                    Spacer()
                    if testing {
                        ProgressView()
                            .controlSize(.small)
                    }
                    Button("测试连接", action: testConnection)
                        .disabled(testing || clearAPIKey)
                }
                Text("Key 仅保存在本机 Keychain。设置、历史、导出和日志不会保存 Key。Base URL 不需要以 /chat/completions 结尾。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    private var explanationTab: some View {
        Form {
            Section("输出语言") {
                Picker("语言", selection: $draft.outputLanguage) {
                    ForEach(OutputLanguage.allCases) { language in
                        Text(languageTitle(language)).tag(language)
                    }
                }
                .pickerStyle(.segmented)
                Text("按当前规则处理中文、英文、日文及混合文字；提示词会保留翻译和语境说明。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("解释详略") {
                Picker("长度", selection: $draft.length) {
                    ForEach(ExplanationLength.allCases) { length in
                        Text(lengthTitle(length)).tag(length)
                    }
                }
                .pickerStyle(.radioGroup)
                Text("对应 max tokens：简洁 360，标准 700，详细 1200。接口不支持该参数时会按错误响应自动降级一次。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("上下文范围") {
                Text("选区最多保留 1800 字，发给模型最多 600 字；段落最多 1800 字，前后文各 400 字。实际能取得多少取决于来源应用的辅助功能支持。")
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    private var applicationsTab: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("在这些应用中停用划词")
                .font(.headline)
            Text("按应用 Bundle ID 控制，保存后生效。停用浏览器会停用整个浏览器；网页域名规则仍由 Chrome 扩展负责。")
                .font(.caption)
                .foregroundStyle(.secondary)
            List(applications) { application in
                Toggle(isOn: excludedBinding(for: application.id)) {
                    HStack(spacing: 9) {
                        if let icon = application.icon {
                            Image(nsImage: icon)
                                .resizable()
                                .frame(width: 22, height: 22)
                        }
                        VStack(alignment: .leading) {
                            Text(application.name)
                            Text(application.id)
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .listStyle(.inset)
            Button("刷新应用列表", action: loadApplications)
        }
        .padding()
    }

    private var historyTab: some View {
        VStack(spacing: 10) {
            HStack {
                Text("最近 \(model.history.count) 条，最多保存 100 条")
                    .foregroundStyle(.secondary)
                Spacer()
                Button("导出 JSON") { exportHistory(.json) }
                Button("导出 Markdown") { exportHistory(.markdown) }
                Button("清空", role: .destructive) { confirmingClear = true }
                    .disabled(model.history.isEmpty)
            }
            if model.history.isEmpty {
                ContentUnavailableView(
                    "暂无解释记录",
                    systemImage: "clock",
                    description: Text("成功完成的解释和追问会保存在这里。")
                )
            } else {
                List(model.history) { entry in
                    Button {
                        model.openHistory(entry)
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(entry.term.isEmpty ? "（无选区）" : entry.term)
                                .font(.headline)
                                .lineLimit(1)
                            if !entry.meaning.isEmpty {
                                Text(entry.meaning)
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                            HStack {
                                Text(entry.sourceAppName.isEmpty ? "未知来源" : entry.sourceAppName)
                                Spacer()
                                Text(entry.createdAt, format: .dateTime.month().day().hour().minute())
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 3)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.inset)
            }
        }
        .padding()
    }

    private var currentPreset: ProviderPreset {
        ProviderPresets.preset(for: draft.provider) ?? ProviderPresets.all[0]
    }

    private var modelPlaceholder: String {
        currentPreset.modelPlaceholder.isEmpty ? "例如 \(currentPreset.model)" : currentPreset.modelPlaceholder
    }

    private func save() {
        do {
            try model.saveSettings(draft, apiKey: apiKey, clearAPIKey: clearAPIKey)
            draft = model.settings
            apiKey = ""
            clearAPIKey = false
            showNotice("设置已保存。")
        } catch {
            showNotice(error.localizedDescription, isError: true)
        }
    }

    private func testConnection() {
        testing = true
        showNotice(nil)
        Task {
            defer { testing = false }
            do {
                let result = try await model.testConnection(settings: draft, apiKey: apiKey)
                showNotice("连接成功：\(result)")
            } catch {
                showNotice(error.localizedDescription, isError: true)
            }
        }
    }

    private func loadApplications() {
        var choices = NSWorkspace.shared.runningApplications.compactMap { app -> ApplicationChoice? in
            guard app.activationPolicy == .regular,
                  let id = app.bundleIdentifier,
                  id != Bundle.main.bundleIdentifier else { return nil }
            return ApplicationChoice(
                id: id,
                name: app.localizedName ?? id,
                icon: app.icon
            )
        }
        let known = Set(choices.map(\.id))
        for id in draft.excludedAppBundleIDs where !known.contains(id) {
            choices.append(ApplicationChoice(id: id, name: id, icon: nil))
        }
        applications = choices.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private func excludedBinding(for id: String) -> Binding<Bool> {
        Binding(
            get: { draft.excludedAppBundleIDs.contains(id) },
            set: { excluded in
                if excluded {
                    if !draft.excludedAppBundleIDs.contains(id) {
                        draft.excludedAppBundleIDs.append(id)
                    }
                } else {
                    draft.excludedAppBundleIDs.removeAll { $0 == id }
                }
            }
        )
    }

    private func exportHistory(_ format: HistoryExportFormat) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "miaodong-history.\(format.fileExtension)"
        panel.canCreateDirectories = true
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            let text = format == .json ? try model.exportHistoryJSON() : try model.exportHistoryMarkdown()
            try text.write(to: url, atomically: true, encoding: .utf8)
            showNotice("历史记录已导出。")
        } catch {
            showNotice("导出失败：\(error.localizedDescription)", isError: true)
        }
    }

    private func showNotice(_ text: String?, isError: Bool = false) {
        notice = text
        noticeIsError = isError
    }

    private func languageTitle(_ language: OutputLanguage) -> String {
        switch language {
        case .zh: "简体中文"
        case .zhHant: "繁体中文"
        case .en: "English"
        case .ja: "日本語"
        }
    }

    private func lengthTitle(_ length: ExplanationLength) -> String {
        switch length {
        case .brief: "简洁：先给核心意思"
        case .standard: "标准：释义、语境和适度延伸"
        case .detailed: "详细：更多背景、辨析和例子"
        }
    }
}
