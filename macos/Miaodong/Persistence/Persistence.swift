import Foundation
import Security

final class SettingsStore {
    static let defaultStorageKey = "settings"

    private let defaults: UserDefaults
    private let storageKey: String

    init(defaults: UserDefaults = .standard, storageKey: String = SettingsStore.defaultStorageKey) {
        self.defaults = defaults
        self.storageKey = storageKey
    }

    func load() -> AppSettings {
        guard let data = defaults.data(forKey: storageKey),
              let settings = try? JSONDecoder().decode(AppSettings.self, from: data) else {
            return .default
        }
        return ProviderPresets.normalized(settings)
    }

    func save(_ settings: AppSettings) throws {
        let normalized = ProviderPresets.normalized(settings)
        let data = try JSONEncoder().encode(normalized)
        defaults.set(data, forKey: storageKey)
    }
}

enum KeychainStoreError: Error {
    case unexpectedStatus(OSStatus)
    case invalidEncoding
}

struct KeychainStore {
    let service: String
    let account: String

    init(service: String = "com.miaodong.app", account: String = "apiKey") {
        self.service = service
        self.account = account
    }

    func read() throws -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else {
            throw KeychainStoreError.unexpectedStatus(status)
        }
        guard let data = result as? Data, let key = String(data: data, encoding: .utf8) else {
            throw KeychainStoreError.invalidEncoding
        }
        return key
    }

    func write(_ apiKey: String) throws {
        let key = ProviderPresets.normalizeAPIKey(apiKey)
        let attributes: [String: Any] = [
            kSecValueData as String: Data(key.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        var item = baseQuery
        for (key, value) in attributes {
            item[key] = value
        }

        let status = SecItemAdd(item as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainStoreError.unexpectedStatus(updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainStoreError.unexpectedStatus(status)
        }
    }

    func delete() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainStoreError.unexpectedStatus(status)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}

final class HistoryStore {
    static let maximumEntries = 100
    static let duplicateInterval: TimeInterval = 120

    let fileURL: URL
    private let fileManager: FileManager

    init(fileURL: URL? = nil, fileManager: FileManager = .default) {
        self.fileManager = fileManager
        if let fileURL {
            self.fileURL = fileURL
        } else {
            let applicationSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
                ?? fileManager.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support", isDirectory: true)
            self.fileURL = applicationSupport
                .appendingPathComponent("Miaodong", isDirectory: true)
                .appendingPathComponent("history.json")
        }
    }

    func load() throws -> [HistoryEntry] {
        guard fileManager.fileExists(atPath: fileURL.path) else { return [] }
        let data = try Data(contentsOf: fileURL)
        return try JSONDecoder().decode([HistoryEntry].self, from: data)
    }

    func save(_ entry: HistoryEntry) throws {
        let entries = try load()
        let filtered = entries.filter { existing in
            if existing.id == entry.id { return false }
            let sameSource = existing.term == entry.term
                && existing.sourceBundleID == entry.sourceBundleID
                && existing.url == entry.url
            let recent = abs(entry.createdAt.timeIntervalSince(existing.createdAt)) < Self.duplicateInterval
            return !(sameSource && recent)
        }
        try write(Array(([entry] + filtered).prefix(Self.maximumEntries)))
    }

    func clear() throws {
        try write([])
    }

    func exportJSON() throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(try load())
        return String(decoding: data, as: UTF8.self)
    }

    func exportMarkdown() throws -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"

        var lines = ["# 秒懂记录", ""]
        for entry in try load() {
            lines.append("## \(entry.term.isEmpty ? "（无选区）" : entry.term)")
            lines.append("")
            lines.append("- 时间：\(formatter.string(from: entry.createdAt))")
            if !entry.sourceAppName.isEmpty {
                lines.append("- 来源应用：\(entry.sourceAppName)")
            }
            if !entry.windowTitle.isEmpty {
                lines.append("- 窗口：\(entry.windowTitle)")
            }
            if let url = entry.url, !url.isEmpty {
                lines.append("- 链接：\(url)")
            }
            lines.append("")
            lines.append(entry.explanation)

            for followUp in entry.followUps {
                lines.append("")
                lines.append("问：\(followUp.question)")
                lines.append("")
                lines.append(followUp.answer)
            }
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }

    private func write(_ entries: [HistoryEntry]) throws {
        let directory = fileURL.deletingLastPathComponent()
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(entries)
        try data.write(to: fileURL, options: .atomic)
    }
}
