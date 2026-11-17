import Combine
import Foundation

@MainActor
final class ExplanationSession: ObservableObject {
    enum Phase: Equatable {
        case idle
        case initial
        case followUp
        case complete
        case failed
        case cancelled
        case closed
    }

    let id: UUID

    @Published private(set) var context: SelectionContext
    @Published private(set) var initialText = ""
    @Published private(set) var followUps: [FollowUp] = []
    @Published private(set) var busy = false
    @Published private(set) var errorMessage: String?
    @Published var isPinned = false
    @Published private(set) var phase: Phase = .idle

    private enum Stage {
        case initial
        case question
        case elaborate
    }

    private struct Request {
        var id: UInt
        let stage: Stage
        let messages: [ChatMessage]
        let followUpID: UUID?
    }

    private let settings: AppSettings
    private let apiKey: String
    private let client: any ChatStreaming
    private let onHistory: (HistoryEntry) -> Void
    private let createdAt = Date()

    private var committedMessages: [ChatMessage] = []
    private var completedFollowUpIDs: Set<UUID> = []
    private var hasInitialAnswer = false
    private var nextRequestID: UInt = 0
    private var activeRequest: Request?
    private var lastRequest: Request?
    private var requestTask: Task<Void, Never>?

    init(
        id: UUID = UUID(),
        context: SelectionContext,
        settings: AppSettings,
        apiKey: String,
        client: any ChatStreaming,
        onHistory: @escaping (HistoryEntry) -> Void = { _ in }
    ) {
        self.id = id
        self.context = context
        self.settings = ProviderPresets.normalized(settings)
        self.apiKey = apiKey
        self.client = client
        self.onHistory = onHistory
    }

    deinit {
        requestTask?.cancel()
    }

    func start() {
        guard !busy, phase != .closed, !hasInitialAnswer,
              activeRequest == nil, lastRequest == nil else { return }
        let request = Request(
            id: makeRequestID(),
            stage: .initial,
            messages: PromptBuilder.initialMessages(for: context, settings: settings),
            followUpID: nil
        )
        initialText = ""
        run(request)
    }

    func ask(question: String) {
        let question = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, canFollowUp else { return }
        beginFollowUp(question: question, stage: .question) { priorTurns in
            PromptBuilder.followUpMessages(
                priorTurns: priorTurns,
                context: context,
                settings: settings,
                kind: .question,
                question: question
            )
        }
    }

    func elaborate() {
        guard canFollowUp else { return }
        beginFollowUp(question: "再详细一点", stage: .elaborate) { priorTurns in
            PromptBuilder.followUpMessages(
                priorTurns: priorTurns,
                context: context,
                settings: settings,
                kind: .elaborate
            )
        }
    }

    func cancel() {
        guard let request = activeRequest else { return }
        lastRequest = request
        activeRequest = nil
        _ = makeRequestID()
        requestTask?.cancel()
        requestTask = nil
        busy = false
        errorMessage = nil
        phase = .cancelled
    }

    func close() {
        activeRequest = nil
        lastRequest = nil
        _ = makeRequestID()
        requestTask?.cancel()
        requestTask = nil
        busy = false
        errorMessage = nil
        phase = .closed
    }

    func retry() {
        guard !busy, phase != .closed, var request = lastRequest else { return }
        request.id = makeRequestID()
        if let followUpID = request.followUpID,
           let index = followUps.firstIndex(where: { $0.id == followUpID }) {
            followUps[index].answer = ""
        } else if request.stage == .initial {
            initialText = ""
        }
        run(request)
    }

    func togglePin() {
        isPinned.toggle()
    }

    var formattedExplanation: String {
        var sections = initialText.isEmpty ? [] : [initialText]
        for followUp in followUps {
            var text = "问：\(followUp.question)"
            if !followUp.answer.isEmpty {
                text += "\n\n答：\(followUp.answer)"
            }
            sections.append(text)
        }
        return sections.joined(separator: "\n\n")
    }

    var meaning: String {
        guard let start = initialText.range(of: "【释义】") else { return "" }
        let remainder = initialText[start.upperBound...]
        let end = PromptBuilder.sectionLabels.dropFirst().compactMap { label in
            remainder.range(of: "【\(label)】")?.lowerBound
        }.min()
        let text = end.map { remainder[..<$0] } ?? remainder[...]
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func historyEntry() -> HistoryEntry {
        HistoryEntry(
            id: id,
            term: context.selectionFull,
            explanation: initialText,
            meaning: meaning,
            sourceAppName: context.sourceAppName,
            sourceBundleID: context.sourceBundleID,
            windowTitle: context.windowTitle,
            url: context.url,
            contextQuality: context.quality,
            createdAt: createdAt,
            followUps: followUps.filter { completedFollowUpIDs.contains($0.id) }
        )
    }

    private var canFollowUp: Bool {
        hasInitialAnswer && !busy && phase != .closed
    }

    private func beginFollowUp(
        question: String,
        stage: Stage,
        makeMessages: ([ChatMessage]) -> [ChatMessage]
    ) {
        followUps.removeAll { !completedFollowUpIDs.contains($0.id) }
        let followUp = FollowUp(question: question)
        followUps.append(followUp)
        let request = Request(
            id: makeRequestID(),
            stage: stage,
            messages: makeMessages(committedMessages),
            followUpID: followUp.id
        )
        run(request)
    }

    private func run(_ request: Request) {
        requestTask?.cancel()
        activeRequest = request
        lastRequest = nil
        busy = true
        errorMessage = nil
        phase = request.stage == .initial ? .initial : .followUp

        requestTask = Task { [weak self] in
            guard let self else { return }
            do {
                try await self.client.streamChat(
                    settings: self.settings,
                    apiKey: self.apiKey,
                    messages: request.messages,
                    maxTokens: self.settings.length.maxTokens
                ) { [weak self] delta in
                    guard let self,
                          self.busy,
                          self.activeRequest?.id == request.id else { return }
                    self.append(delta, to: request)
                }
                try Task.checkCancellation()
                guard self.activeRequest?.id == request.id else { return }
                self.complete(request)
            } catch {
                guard self.activeRequest?.id == request.id else { return }
                self.fail(request, with: error)
            }
        }
    }

    private func append(_ delta: String, to request: Request) {
        if request.stage == .initial {
            initialText += delta
            return
        }
        guard let followUpID = request.followUpID,
              let index = followUps.firstIndex(where: { $0.id == followUpID }) else { return }
        followUps[index].answer += delta
    }

    private func complete(_ request: Request) {
        switch request.stage {
        case .initial:
            committedMessages = request.messages + [
                ChatMessage(role: .assistant, content: initialText)
            ]
            hasInitialAnswer = true
        case .question, .elaborate:
            guard let followUpID = request.followUpID,
                  let followUp = followUps.first(where: { $0.id == followUpID }) else { return }
            committedMessages = request.messages + [
                ChatMessage(role: .assistant, content: followUp.answer)
            ]
            completedFollowUpIDs.insert(followUpID)
        }

        activeRequest = nil
        lastRequest = nil
        requestTask = nil
        busy = false
        errorMessage = nil
        phase = .complete
        onHistory(historyEntry())
    }

    private func fail(_ request: Request, with error: Error) {
        activeRequest = nil
        lastRequest = request
        requestTask = nil
        busy = false
        if ChatClient.isCancellation(error) || Task.isCancelled {
            errorMessage = nil
            phase = .cancelled
        } else {
            errorMessage = ChatClient.userMessage(for: error, apiKey: apiKey)
            phase = .failed
        }
    }

    private func makeRequestID() -> UInt {
        nextRequestID &+= 1
        return nextRequestID
    }
}
