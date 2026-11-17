import Foundation

struct AppSettings: Codable, Equatable {
    var enabled: Bool
    var provider: String
    var baseUrl: String
    var model: String
    var outputLanguage: OutputLanguage
    var length: ExplanationLength
    var excludedAppBundleIDs: [String]

    static let `default` = AppSettings(
        enabled: true,
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        model: "deepseek-chat",
        outputLanguage: .zh,
        length: .standard,
        excludedAppBundleIDs: []
    )
}

enum OutputLanguage: String, Codable, CaseIterable, Identifiable {
    case zh
    case zhHant = "zh-Hant"
    case en
    case ja

    var id: String { rawValue }
}

enum ExplanationLength: String, Codable, CaseIterable, Identifiable {
    case brief
    case standard
    case detailed

    var id: String { rawValue }

    var maxTokens: Int {
        switch self {
        case .brief: 360
        case .standard: 700
        case .detailed: 1200
        }
    }
}

enum ContextQuality: String, Codable, Equatable {
    case axParagraph
    case axSelectionOnly
    case clipboard
}

enum DetectedScript: String, Codable, Equatable {
    case zh
    case en
    case mixed
    case ja
    case other
}

struct SelectionAnchor: Codable, Equatable {
    var x: Double
    var y: Double
    var width: Double
    var height: Double

    init(x: Double, y: Double, width: Double = 0, height: Double = 0) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }

    init(rect: CGRect) {
        self.init(x: rect.origin.x, y: rect.origin.y, width: rect.width, height: rect.height)
    }

    var rect: CGRect {
        CGRect(x: x, y: y, width: width, height: height)
    }
}

struct SelectionContext: Codable, Equatable {
    var selectionFull: String
    var promptSelection: String
    var truncated: Bool
    var paragraph: String
    var before: String
    var after: String
    var sourceAppName: String
    var sourceBundleID: String
    var windowTitle: String
    var url: String?
    var quality: ContextQuality
    var anchor: SelectionAnchor?

    init(
        selectionFull: String,
        promptSelection: String? = nil,
        truncated: Bool? = nil,
        paragraph: String = "",
        before: String = "",
        after: String = "",
        sourceAppName: String = "",
        sourceBundleID: String = "",
        windowTitle: String = "",
        url: String? = nil,
        quality: ContextQuality,
        anchor: SelectionAnchor? = nil
    ) {
        self.selectionFull = String(selectionFull.prefix(1800))
        self.promptSelection = String((promptSelection ?? selectionFull).prefix(600))
        self.truncated = truncated ?? (selectionFull.count > 600)
        self.paragraph = String(paragraph.prefix(1800))
        self.before = String(before.prefix(400))
        self.after = String(after.prefix(400))
        self.sourceAppName = sourceAppName
        self.sourceBundleID = sourceBundleID
        self.windowTitle = String(windowTitle.prefix(200))
        self.url = url
        self.quality = quality
        self.anchor = anchor
    }
}

struct ChatMessage: Codable, Equatable {
    enum Role: String, Codable {
        case system
        case user
        case assistant
    }

    var role: Role
    var content: String
}

struct FollowUp: Codable, Equatable, Identifiable {
    var id: UUID
    var question: String
    var answer: String

    init(id: UUID = UUID(), question: String, answer: String = "") {
        self.id = id
        self.question = question
        self.answer = answer
    }
}

struct HistoryEntry: Codable, Equatable, Identifiable {
    var id: UUID
    var term: String
    var explanation: String
    var meaning: String
    var sourceAppName: String
    var sourceBundleID: String
    var windowTitle: String
    var url: String?
    var contextQuality: ContextQuality
    var createdAt: Date
    var followUps: [FollowUp]

    init(
        id: UUID = UUID(),
        term: String,
        explanation: String,
        meaning: String = "",
        sourceAppName: String = "",
        sourceBundleID: String = "",
        windowTitle: String = "",
        url: String? = nil,
        contextQuality: ContextQuality = .axSelectionOnly,
        createdAt: Date = Date(),
        followUps: [FollowUp] = []
    ) {
        self.id = id
        self.term = String(term.prefix(80))
        self.explanation = explanation
        self.meaning = meaning
        self.sourceAppName = sourceAppName
        self.sourceBundleID = sourceBundleID
        self.windowTitle = windowTitle
        self.url = url
        self.contextQuality = contextQuality
        self.createdAt = createdAt
        self.followUps = followUps
    }
}
