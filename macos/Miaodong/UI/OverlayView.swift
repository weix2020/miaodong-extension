import AppKit
import SwiftUI

struct TriggerView: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("懂")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(Color.accentColor, in: Circle())
                .shadow(color: .black.opacity(0.2), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
        .help("解释选中文字")
    }
}

struct ExplanationCardView: View {
    @ObservedObject var session: ExplanationSession
    let onClose: () -> Void
    let onActivate: () -> Void

    @State private var question = ""
    @State private var copied = false
    @FocusState private var questionFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            contextNotice
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if session.initialText.isEmpty && session.busy {
                        loadingView
                    }
                    if !session.initialText.isEmpty {
                        Text(session.initialText)
                            .font(.body)
                            .lineSpacing(5)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    ForEach(session.followUps) { followUp in
                        VStack(alignment: .leading, spacing: 9) {
                            Text(followUp.question)
                                .font(.callout.weight(.medium))
                                .padding(.horizontal, 11)
                                .padding(.vertical, 7)
                                .background(Color.accentColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
                            if followUp.answer.isEmpty && session.busy {
                                ProgressView()
                                    .controlSize(.small)
                            } else if !followUp.answer.isEmpty {
                                Text(followUp.answer)
                                    .font(.body)
                                    .lineSpacing(5)
                                    .textSelection(.enabled)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let error = session.errorMessage, !error.isEmpty {
                        VStack(alignment: .leading, spacing: 9) {
                            Label(error, systemImage: "exclamationmark.triangle.fill")
                                .foregroundStyle(.red)
                                .font(.callout)
                                .fixedSize(horizontal: false, vertical: true)
                            Button("重试", action: session.retry)
                        }
                    } else if session.phase == .cancelled {
                        HStack {
                            Text("已停止。")
                                .foregroundStyle(.secondary)
                            Button("重试", action: session.retry)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if session.phase == .complete {
                Divider()
                followUpComposer
            } else if session.busy && !session.initialText.isEmpty {
                Divider()
                HStack {
                    ProgressView()
                        .controlSize(.small)
                    Text("正在回答…")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("停止", action: session.cancel)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
        }
        .frame(width: 440, height: 550)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(.quaternary)
        }
        .onExitCommand(perform: onClose)
    }

    private var header: some View {
        HStack(spacing: 10) {
            Text("懂")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 25, height: 25)
                .background(Color.accentColor, in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(session.context.promptSelection)
                    .font(.headline)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(sourceDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            iconButton(copied ? "checkmark" : "doc.on.doc", help: "复制全部解释") {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(session.formattedExplanation, forType: .string)
                copied = true
                Task {
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    if !Task.isCancelled { copied = false }
                }
            }
            .disabled(session.formattedExplanation.isEmpty)
            iconButton(session.isPinned ? "pin.fill" : "pin", help: session.isPinned ? "取消固定" : "固定卡片") {
                session.togglePin()
            }
            .foregroundStyle(session.isPinned ? Color.accentColor : Color.secondary)
            iconButton("xmark", help: "关闭", action: onClose)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
    }

    @ViewBuilder
    private var contextNotice: some View {
        if session.context.quality != .axParagraph {
            HStack(alignment: .top, spacing: 7) {
                Image(systemName: "info.circle")
                Text(session.context.quality == .clipboard
                     ? "仅基于复制文字，没有周围文本。"
                     : "仅取得选中文字，没有可靠的段落和前后文。")
                Spacer()
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color.secondary.opacity(0.06))
        }
    }

    private var loadingView: some View {
        HStack(spacing: 10) {
            ProgressView()
                .controlSize(.small)
            Text(session.context.quality == .axParagraph ? "正在结合上下文解释…" : "正在解释…")
                .foregroundStyle(.secondary)
            Spacer()
            Button("停止", action: session.cancel)
        }
        .font(.callout)
    }

    private var followUpComposer: some View {
        VStack(spacing: 9) {
            HStack {
                Button("再详细一点", action: session.elaborate)
                    .buttonStyle(.borderless)
                    .font(.callout)
                Spacer()
            }
            HStack(spacing: 8) {
                TextField("继续追问这段文字…", text: $question)
                    .textFieldStyle(.roundedBorder)
                    .focused($questionFocused)
                    .onTapGesture {
                        onActivate()
                        questionFocused = true
                    }
                    .onChange(of: questionFocused) {
                        if questionFocused { onActivate() }
                    }
                    .onSubmit(sendQuestion)
                Button(action: sendQuestion) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                }
                .buttonStyle(.plain)
                .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .keyboardShortcut(.return, modifiers: [])
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private var sourceDescription: String {
        let app = session.context.sourceAppName.isEmpty ? "未知来源" : session.context.sourceAppName
        guard !session.context.windowTitle.isEmpty else { return app }
        return "\(app) · \(session.context.windowTitle)"
    }

    private func sendQuestion() {
        let text = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        question = ""
        session.ask(question: text)
    }

    private func iconButton(
        _ systemName: String,
        help: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .medium))
                .frame(width: 23, height: 23)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(.secondary)
        .help(help)
    }
}

struct HistoryCardView: View {
    let entry: HistoryEntry
    let onClose: () -> Void
    @State private var copied = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundStyle(Color.accentColor)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.term)
                        .font(.headline)
                        .lineLimit(1)
                    Text(entry.createdAt, format: .dateTime.year().month().day().hour().minute())
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(fullText, forType: .string)
                    copied = true
                } label: {
                    Image(systemName: copied ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(.plain)
                .help("复制记录")
                Button(action: onClose) {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.plain)
                .help("关闭")
            }
            .padding(14)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(entry.explanation)
                        .lineSpacing(5)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ForEach(entry.followUps) { followUp in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("问：\(followUp.question)")
                                .font(.callout.weight(.medium))
                            Text(followUp.answer)
                                .lineSpacing(5)
                                .textSelection(.enabled)
                        }
                    }
                    if !entry.sourceAppName.isEmpty || !entry.windowTitle.isEmpty {
                        Text([entry.sourceAppName, entry.windowTitle]
                            .filter { !$0.isEmpty }
                            .joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(16)
            }
        }
        .frame(width: 440, height: 550)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(.quaternary)
        }
        .onExitCommand(perform: onClose)
    }

    private var fullText: String {
        var sections = [entry.explanation]
        for followUp in entry.followUps {
            sections.append("问：\(followUp.question)\n\n答：\(followUp.answer)")
        }
        return sections.joined(separator: "\n\n")
    }
}
