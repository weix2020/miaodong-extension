import AppKit
import ApplicationServices
import Combine
import Foundation

enum AppStateError: LocalizedError {
    case validation([String])

    var errorDescription: String? {
        switch self {
        case .validation(let errors):
            return errors.joined(separator: "\n")
        }
    }
}

@MainActor
final class AppState: ObservableObject {
    @Published private(set) var settings: AppSettings
    @Published private(set) var history: [HistoryEntry] = []
    @Published private(set) var hasStoredAPIKey = false
    @Published private(set) var accessibilityGranted = false
    @Published private(set) var showsPrivacyNotice: Bool
    @Published var menuMessage: String?

    let overlays: OverlayController

    private let settingsStore: SettingsStore
    private let keychainStore: KeychainStore
    private let historyStore: HistoryStore
    private let defaults: UserDefaults
    private let client: any ChatStreaming
    private let selectionMonitor: SelectionMonitor
    private var candidate: SelectionContext?
    private var activeSession: ExplanationSession?

    init(
        settingsStore: SettingsStore = SettingsStore(),
        keychainStore: KeychainStore = KeychainStore(),
        historyStore: HistoryStore = HistoryStore(),
        defaults: UserDefaults = .standard,
        client: (any ChatStreaming)? = nil,
        selectionMonitor: SelectionMonitor? = nil
    ) {
        self.settingsStore = settingsStore
        self.keychainStore = keychainStore
        self.historyStore = historyStore
        self.defaults = defaults
        self.client = client ?? ChatClient()
        self.settings = settingsStore.load()
        self.showsPrivacyNotice = !defaults.bool(forKey: "didShowPrivacyNotice")
        self.accessibilityGranted = AXIsProcessTrusted()
        self.overlays = OverlayController()
        self.selectionMonitor = selectionMonitor ?? SelectionMonitor()

        if let key = try? keychainStore.read() {
            hasStoredAPIKey = !ProviderPresets.normalizeAPIKey(key).isEmpty
        }
        do {
            history = try historyStore.load()
        } catch {
            menuMessage = "读取历史记录失败：\(error.localizedDescription)"
        }

        configureMonitor(self.selectionMonitor)
        overlays.onExplain = { [weak self] context in
            self?.startExplanation(context)
        }
        overlays.onCloseSession = { [weak self] session in
            self?.close(session)
        }
        self.selectionMonitor.start()
    }

    func dismissPrivacyNotice() {
        showsPrivacyNotice = false
        defaults.set(true, forKey: "didShowPrivacyNotice")
    }

    func refreshAccessibilityPermission() {
        let granted = AXIsProcessTrusted()
        guard granted != accessibilityGranted else { return }
        accessibilityGranted = granted
        selectionMonitor.accessibilityPermissionDidChange()
        if !granted {
            candidate = nil
            overlays.hideTrigger()
        }
    }

    func requestAccessibilityPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        accessibilityGranted = AXIsProcessTrustedWithOptions(options)
        selectionMonitor.accessibilityPermissionDidChange()
        if !accessibilityGranted {
            menuMessage = "请在“系统设置 › 隐私与安全性 › 辅助功能”中允许秒懂。"
        } else {
            menuMessage = nil
        }
    }

    func setEnabled(_ enabled: Bool) {
        guard settings.enabled != enabled else { return }
        settings.enabled = enabled
        do {
            try settingsStore.save(settings)
        } catch {
            menuMessage = "保存启用状态失败：\(error.localizedDescription)"
        }
        applySettings()
    }

    func saveSettings(
        _ newSettings: AppSettings,
        apiKey: String,
        clearAPIKey: Bool
    ) throws {
        let normalized = ProviderPresets.normalized(newSettings)
        let errors = ProviderPresets.validationErrors(for: normalized)
        guard errors.isEmpty else { throw AppStateError.validation(errors) }

        if clearAPIKey {
            try keychainStore.delete()
        }
        let newKey = ProviderPresets.normalizeAPIKey(apiKey)
        if !newKey.isEmpty {
            try keychainStore.write(newKey)
        }
        try settingsStore.save(normalized)

        settings = normalized
        hasStoredAPIKey = !newKey.isEmpty || (!clearAPIKey && hasStoredAPIKey)
        applySettings()
    }

    func testConnection(settings draft: AppSettings, apiKey: String) async throws -> String {
        let normalized = ProviderPresets.normalized(draft)
        let newKey = ProviderPresets.normalizeAPIKey(apiKey)
        let key = newKey.isEmpty ? (try keychainStore.read() ?? "") : newKey
        let errors = ProviderPresets.validationErrors(
            for: normalized,
            apiKey: key,
            requireKey: true
        )
        guard errors.isEmpty else { throw AppStateError.validation(errors) }
        return try await client.testConnection(settings: normalized, apiKey: key)
    }

    func explainClipboard() {
        refreshAccessibilityPermission()
        guard let text = NSPasteboard.general.string(forType: .string),
              let extracted = ContextExtractor.extract(
                selectedText: text,
                sourceText: nil,
                selectedRange: nil
              ) else {
            menuMessage = "剪贴板里没有可解释的文字。"
            return
        }
        let context = SelectionContext(
            selectionFull: extracted.selectionFull,
            promptSelection: extracted.promptSelection,
            truncated: extracted.truncated,
            sourceAppName: "剪贴板",
            quality: .clipboard
        )
        menuMessage = nil
        startExplanation(context)
    }

    func openHistory(_ entry: HistoryEntry) {
        if activeSession?.isPinned == true {
            menuMessage = "固定的解释卡片仍在显示，请先关闭它。"
            return
        }
        closeActiveSession()
        candidate = nil
        overlays.hideTrigger()
        overlays.showHistory(entry)
    }

    func clearHistory() throws {
        try historyStore.clear()
        history = []
    }

    func exportHistoryJSON() throws -> String {
        try historyStore.exportJSON()
    }

    func exportHistoryMarkdown() throws -> String {
        try historyStore.exportMarkdown()
    }

    private func configureMonitor(_ monitor: SelectionMonitor) {
        monitor.isEnabled = settings.enabled
        monitor.excludedAppBundleIDs = Set(settings.excludedAppBundleIDs)
        monitor.onCandidate = { [weak self] context in
            self?.receiveCandidate(context)
        }
        monitor.onExternalInteraction = { [weak self] in
            self?.handleExternalInteraction()
        }
    }

    private func receiveCandidate(_ context: SelectionContext) {
        guard settings.enabled, accessibilityGranted else { return }
        guard activeSession?.isPinned != true else { return }
        closeActiveSession()
        overlays.hideCard()
        candidate = context
        overlays.showTrigger(for: context)
    }

    private func handleExternalInteraction() {
        candidate = nil
        overlays.hideTrigger()
        if let session = activeSession {
            if !session.isPinned {
                closeActiveSession()
            }
        } else {
            overlays.hideCard()
        }
    }

    private func startExplanation(_ context: SelectionContext) {
        guard activeSession?.isPinned != true else {
            menuMessage = "固定的解释卡片仍在显示，请先关闭它。"
            return
        }
        closeActiveSession()
        overlays.hideCard()
        candidate = nil
        overlays.hideTrigger()

        let key: String
        do {
            key = try keychainStore.read() ?? ""
            hasStoredAPIKey = !ProviderPresets.normalizeAPIKey(key).isEmpty
        } catch {
            key = ""
            menuMessage = "读取 API Key 失败：\(error.localizedDescription)"
        }

        let session = ExplanationSession(
            context: context,
            settings: settings,
            apiKey: key,
            client: client,
            onHistory: { [weak self] entry in
                self?.recordHistory(entry)
            }
        )
        activeSession = session
        overlays.show(session: session)
        session.start()
    }

    private func close(_ session: ExplanationSession) {
        session.close()
        guard activeSession?.id == session.id else { return }
        activeSession = nil
        overlays.hideCard()
    }

    private func closeActiveSession() {
        activeSession?.close()
        activeSession = nil
        overlays.hideCard()
    }

    private func applySettings() {
        selectionMonitor.isEnabled = settings.enabled
        selectionMonitor.excludedAppBundleIDs = Set(settings.excludedAppBundleIDs)
        guard !settings.enabled else { return }
        candidate = nil
        overlays.hideTrigger()
        closeActiveSession()
    }

    private func recordHistory(_ entry: HistoryEntry) {
        do {
            try historyStore.save(entry)
            history = try historyStore.load()
        } catch {
            menuMessage = "保存历史记录失败：\(error.localizedDescription)"
        }
    }
}
