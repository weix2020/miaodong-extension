import Foundation

enum FollowUpKind {
    case elaborate
    case question
}

enum PromptBuilder {
    static let sectionLabels = ["释义", "语境", "延伸", "翻译"]

    static func initialMessages(for context: SelectionContext, settings: AppSettings) -> [ChatMessage] {
        let hasParagraph = hasParagraphContext(context)
        let system = systemTemplate
            .replacingOccurrences(of: "{{contextRule}}", with: contextRule(hasParagraph: hasParagraph))
            .replacingOccurrences(of: "{{translationRule}}", with: translationRule(settings.outputLanguage))
            .replacingOccurrences(of: "{{language}}", with: languageRule(settings.outputLanguage))
            .replacingOccurrences(of: "{{length}}", with: lengthRule(settings.length))

        let selection = promptSelection(for: context)
        let paragraph = hasParagraph ? String(context.paragraph.prefix(1800)) : ""
        let before = hasParagraph ? String(context.before.prefix(400)) : ""
        let after = hasParagraph ? String(context.after.prefix(400)) : ""
        var user = userTemplate
            .replacingOccurrences(of: "{{selection}}", with: blank(selection))
            .replacingOccurrences(of: "{{paragraph}}", with: blank(paragraph))
            .replacingOccurrences(of: "{{before}}", with: blank(before))
            .replacingOccurrences(of: "{{after}}", with: blank(after))
            .replacingOccurrences(of: "{{windowTitle}}", with: blank(context.windowTitle))
            .replacingOccurrences(of: "{{sourceApp}}", with: blank(context.sourceAppName))
            .replacingOccurrences(of: "{{sourceBundleID}}", with: blank(context.sourceBundleID))
            .replacingOccurrences(of: "{{url}}", with: blank(context.url))
            .replacingOccurrences(of: "{{quality}}", with: qualityDescription(context.quality, hasParagraph: hasParagraph))
            .replacingOccurrences(of: "{{contextNotice}}", with: contextNotice(context, hasParagraph: hasParagraph))
            .replacingOccurrences(of: "{{script}}", with: scriptDescription(detectScript(selection)))

        if context.truncated || context.selectionFull.count > selection.count {
            user += "\n\n（选中文字过长，这里只保留了前段。）"
        }

        return [
            ChatMessage(role: .system, content: system),
            ChatMessage(role: .user, content: user)
        ]
    }

    static func followUpMessages(
        priorTurns: [ChatMessage],
        context: SelectionContext,
        settings: AppSettings,
        kind: FollowUpKind,
        question: String = ""
    ) -> [ChatMessage] {
        let hasParagraph = hasParagraphContext(context)
        let preamble = followUpPreamble
            .replacingOccurrences(of: "{{language}}", with: languageRule(settings.outputLanguage))
            .replacingOccurrences(of: "{{contextConstraint}}", with: followUpContextConstraint(context, hasParagraph: hasParagraph))

        let body: String
        switch kind {
        case .elaborate:
            body = elaboratePrompt
        case .question:
            let selection = blank(promptSelection(for: context))
            let trimmedQuestion = question.trimmingCharacters(in: .whitespacesAndNewlines)
            let answerInstruction: String
            if hasParagraph {
                answerInstruction = "请针对选中文字「\(selection)」和它所在的段落来答。短一些，但把问题答完。"
            } else {
                answerInstruction = "请针对选中文字「\(selection)」来答。短一些，但把问题答完。\(noContextInstruction(context.quality))"
            }
            body = "读者的追问：\(trimmedQuestion)\n\(answerInstruction)"
        }

        return priorTurns + [ChatMessage(role: .user, content: "\(preamble)\n\n\(body)")]
    }

    static func detectScript(_ text: String) -> DetectedScript {
        var chinese = 0
        var latin = 0
        var kana = 0

        for scalar in text.unicodeScalars {
            switch scalar.value {
            case 0x3400...0x9FFF:
                chinese += 1
            case 0x3040...0x30FF:
                kana += 1
            case 0x41...0x5A, 0x61...0x7A:
                latin += 1
            default:
                break
            }
        }

        if kana > chinese && kana >= latin && kana > 0 { return .ja }
        if chinese == 0 && latin == 0 { return .other }
        if chinese > 0 && latin > 0 {
            let ratio = Double(min(chinese, latin)) / Double(max(chinese, latin))
            if ratio > 0.25 { return .mixed }
        }
        return latin > chinese ? .en : .zh
    }

    private static func hasParagraphContext(_ context: SelectionContext) -> Bool {
        context.quality == .axParagraph && !context.paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private static func promptSelection(for context: SelectionContext) -> String {
        let value = context.promptSelection.isEmpty ? context.selectionFull : context.promptSelection
        return String(value.prefix(600))
    }

    private static func blank(_ value: String?) -> String {
        let text = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? "（无）" : text
    }

    private static func languageRule(_ language: OutputLanguage) -> String {
        switch language {
        case .zh:
            "全文使用简体中文。专名和原文术语可以保留原文。"
        case .zhHant:
            "全文使用繁體中文。專名和原文術語可以保留原文。"
        case .en:
            "Write the body of each section in English. Keep the Chinese section labels exactly as given. Keep proper nouns as they appear in the source."
        case .ja:
            "各段の本文は日本語で書く。見出しの【】ラベルは中国語のままにする。固有名詞は原文のまま残してよい。"
        }
    }

    private static func translationRule(_ language: OutputLanguage) -> String {
        switch language {
        case .zh:
            "选中文字的主体若不是中文，在这里给出通顺的简体中文翻译；若主体已是中文，只写「无」。"
        case .zhHant:
            "選中文字的主體若不是中文，在這裡給出通順的繁體中文翻譯；若主體已是中文，只寫「無」。"
        case .en:
            "If the selection is not primarily English, give a natural English translation; if it is already English, write \"none\"."
        case .ja:
            "選ばれた文字の主体が日本語でなければ、ここに自然な日本語訳を書く。すでに日本語なら「無」とだけ書く。"
        }
    }

    private static func lengthRule(_ length: ExplanationLength) -> String {
        switch length {
        case .brief:
            "尽量短。【释义】一句；【语境】一句；【延伸】写「无」，除非一个相关术语能消掉明显歧义。"
        case .standard:
            "【释义】一句话；【语境】两到四句；【延伸】一个贴近的例子，或两到三个相关术语。"
        case .detailed:
            "【释义】一到两句，把边界说清；【语境】四到六句；【延伸】一个具体例子，并点出一个容易混淆的邻近概念。"
        }
    }

    private static func scriptDescription(_ script: DetectedScript) -> String {
        switch script {
        case .zh: "中文为主"
        case .en: "拉丁字母为主，多半需要翻译"
        case .mixed: "中外文夹杂"
        case .ja: "日文为主"
        case .other: "符号、公式或其它文字"
        }
    }

    private static func qualityDescription(_ quality: ContextQuality, hasParagraph: Bool) -> String {
        if quality == .axParagraph && !hasParagraph {
            return "辅助功能仅选区（未取得段落）"
        }
        switch quality {
        case .axParagraph: return "辅助功能段落上下文"
        case .axSelectionOnly: return "辅助功能仅选区"
        case .clipboard: return "用户明确提供的复制文字"
        }
    }

    private static func contextRule(hasParagraph: Bool) -> String {
        if hasParagraph {
            return "说明它在给定段落里具体指什么、和前后句是什么关系。点到为止。"
        }
        return "说明选中文字在当前使用场景里可能表达什么。没有周围文本，不得虚构前后句或所在段落；无法判断时就说明语境不足。"
    }

    private static func contextNotice(_ context: SelectionContext, hasParagraph: Bool) -> String {
        if hasParagraph {
            return "已通过辅助功能取得选区所在段落；前后文仅在对应字段非空时可用。"
        }
        switch context.quality {
        case .clipboard:
            return "仅基于复制文字，没有周围文本。不要推测或编造所在段落、前文或后文。"
        case .axParagraph, .axSelectionOnly:
            return "只能取得选中文字，没有周围文本。不要推测或编造所在段落、前文或后文。"
        }
    }

    private static func noContextInstruction(_ quality: ContextQuality) -> String {
        switch quality {
        case .clipboard:
            return "这里只有复制文字，没有周围文本，不要推测所在段落或前后文。"
        case .axParagraph, .axSelectionOnly:
            return "没有周围文本，不要推测所在段落或前后文。"
        }
    }

    private static func followUpContextConstraint(_ context: SelectionContext, hasParagraph: Bool) -> String {
        if hasParagraph {
            return "紧扣已经解释过的选中文字和它所在的段落，"
        }
        switch context.quality {
        case .clipboard:
            return "紧扣已经解释过的复制文字。这里只有复制文字，没有周围文本，不要推测所在段落或前后文，"
        case .axParagraph, .axSelectionOnly:
            return "紧扣已经解释过的选中文字。没有周围文本，不要推测所在段落或前后文，"
        }
    }

    private static let systemTemplate = """
你是「秒懂」。有人正在阅读，刚刚选中一小段文字（可能是词、术语、缩写、概念、人名、公式或句子），希望你就地解释，不要把话题扯开。读者受过教育，只是眼前这个说法不熟。对方常读社会学和人文社科，也会碰到英文、缩写和公式。别写成儿童读物，也别堆砌行话。

只输出下面四段。每段单独起行，以中文标签开头。不要翻译标签本身。不要写前言、标题、编号或结束语。

【释义】
【语境】
【延伸】
【翻译】

各段怎么写：
- 【释义】只用一句话，解释选中文字本身的直白意思。不要把所在段落重说一遍。
- 【语境】{{contextRule}}
- 【延伸】给一个贴近的例子，或两到三个相关术语（用「 · 」连接）。没有合适的就只写「无」。
- 【翻译】{{translationRule}}

若选中的是人名：说明这个人是谁、在这类讨论里通常因为什么被提到。不要写一篇传记。

约束：
- 输出语言：{{language}}
- 详略：{{length}}
- 用平常话把事情说清楚。必要的专名保留原文，可在后面加一个短注。
- 不确定就直接说不确定。不要编造书名、页码、年份、引文或统计数字。
- 遇到公式，只说明符号在这里大概表示什么，不要展开推导。
- 不要自称人工智能，不要写「根据你提供的上下文」「希望这对你有帮助」这类套话。
"""

    private static let userTemplate = """
选中文字：
{{selection}}

所在段落：
{{paragraph}}

前文：
{{before}}

后文：
{{after}}

窗口标题：{{windowTitle}}
来源应用：{{sourceApp}}
来源 Bundle ID：{{sourceBundleID}}
链接：{{url}}
上下文质量：{{quality}}
上下文说明：{{contextNotice}}
这段选中文字的脚本：{{script}}
"""

    private static let followUpPreamble = """
下面是追问。请直接用散文回答，不要再使用【释义】【语境】【延伸】【翻译】这些标签，也不要分成四段。{{contextConstraint}}不要另起无关的话题。输出语言：{{language}}。不确定就说明不确定，不要编造出处。
"""

    private static let elaboratePrompt = "请讲得再具体一些：补上这个说法的边界、一个能想象的例子，以及一个容易混在一起的邻近说法。不要重复刚才已经说过的原句。"
}
