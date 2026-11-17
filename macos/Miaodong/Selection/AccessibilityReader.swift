import ApplicationServices
import CoreGraphics
import Foundation

struct ContextExtraction {
    var selectionFull: String
    var promptSelection: String
    var truncated: Bool
    var paragraph: String
    var before: String
    var after: String
    var quality: ContextQuality
}

enum ContextExtractor {
    static func extract(
        selectedText: String,
        sourceText: String?,
        selectedRange: NSRange?
    ) -> ContextExtraction? {
        let selection = normalize(selectedText)
        guard isMeaningful(selection) else { return nil }
        let selectionFull = String(selection.prefix(1800))
        let base = ContextExtraction(
            selectionFull: selectionFull,
            promptSelection: String(selection.prefix(600)),
            truncated: selection.count > 600,
            paragraph: "",
            before: "",
            after: "",
            quality: .axSelectionOnly
        )

        guard let sourceText, let selectedRange,
              selectedRange.location != NSNotFound,
              selectedRange.location >= 0, selectedRange.length > 0,
              selectedRange.location <= (sourceText as NSString).length,
              selectedRange.length <= (sourceText as NSString).length - selectedRange.location,
              let paragraphRange = paragraphRange(in: sourceText, selection: selectedRange),
              let paragraphSwiftRange = Range(paragraphRange, in: sourceText),
              let beforeSwiftRange = Range(NSRange(location: 0, length: selectedRange.location), in: sourceText),
              let afterSwiftRange = Range(
                NSRange(location: NSMaxRange(selectedRange), length: (sourceText as NSString).length - NSMaxRange(selectedRange)),
                in: sourceText
              ) else {
            return base
        }

        let paragraph = String(sourceText[paragraphSwiftRange])
        let relativeSelection = NSRange(
            location: selectedRange.location - paragraphRange.location,
            length: selectedRange.length
        )
        var result = base
        result.paragraph = centeredParagraph(paragraph, selection: relativeSelection, limit: 1800)
        result.before = normalize(String(sourceText[beforeSwiftRange].suffix(400)))
        result.after = normalize(String(sourceText[afterSwiftRange].prefix(400)))
        if !result.paragraph.isEmpty {
            result.quality = .axParagraph
        }
        return result
    }

    static func normalize(_ value: String) -> String {
        var text = value
            .replacingOccurrences(of: "\u{00A0}", with: " ")
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .precomposedStringWithCanonicalMapping
        text = text.replacingOccurrences(of: "[ \\t]+\\n", with: "\n", options: .regularExpression)
        text = text.replacingOccurrences(of: "\\n{3,}", with: "\n\n", options: .regularExpression)
        text = text.replacingOccurrences(of: "[ \\t]{2,}", with: " ", options: .regularExpression)
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func isMeaningful(_ text: String) -> Bool {
        text.unicodeScalars.contains { scalar in
            if CharacterSet.letters.contains(scalar) { return true }
            switch scalar.properties.generalCategory {
            case .decimalNumber, .letterNumber, .otherNumber:
                return true
            default:
                return false
            }
        }
    }

    private static func paragraphRange(in text: String, selection: NSRange) -> NSRange? {
        let nsText = text as NSString
        var start = 0
        if selection.location > 0 {
            let found = nsText.rangeOfCharacter(
                from: .newlines,
                options: .backwards,
                range: NSRange(location: 0, length: selection.location)
            )
            if found.location != NSNotFound {
                start = NSMaxRange(found)
            }
        }

        var end = nsText.length
        let selectionEnd = NSMaxRange(selection)
        if selectionEnd < nsText.length {
            let found = nsText.rangeOfCharacter(
                from: .newlines,
                options: [],
                range: NSRange(location: selectionEnd, length: nsText.length - selectionEnd)
            )
            if found.location != NSNotFound {
                end = found.location
            }
        }
        guard start <= end else { return nil }
        return NSRange(location: start, length: end - start)
    }

    private static func centeredParagraph(_ paragraph: String, selection: NSRange, limit: Int) -> String {
        guard paragraph.count > limit, let selected = Range(selection, in: paragraph) else {
            return normalize(String(paragraph.prefix(limit)))
        }
        let selectionLength = paragraph.distance(from: selected.lowerBound, to: selected.upperBound)
        if selectionLength >= limit {
            let end = paragraph.index(selected.lowerBound, offsetBy: limit)
            return normalize(String(paragraph[selected.lowerBound..<end]))
        }

        let selectionStart = paragraph.distance(from: paragraph.startIndex, to: selected.lowerBound)
        let centeredStart = selectionStart - (limit - selectionLength) / 2
        let startOffset = max(0, min(paragraph.count - limit, centeredStart))
        let start = paragraph.index(paragraph.startIndex, offsetBy: startOffset)
        let end = paragraph.index(start, offsetBy: limit)
        return normalize(String(paragraph[start..<end]))
    }
}

actor AccessibilityReader {
    private let contextRadius = 2400
    private let maxParameterizedSelectionLength = 4000
    private let maxValueCharacters = 12000
    private let maxRecoveredSelectionLength = 7200

    func readSelection(source: SelectionSource, fallbackAnchor: SelectionAnchor?) async -> SelectionContext? {
        guard AXIsProcessTrusted() else { return nil }
        let application = AXUIElementCreateApplication(source.pid)
        let systemWide = AXUIElementCreateSystemWide()
        guard let focused = elementAttribute(systemWide, kAXFocusedUIElementAttribute)
            ?? elementAttribute(application, kAXFocusedUIElementAttribute),
            !isSecure(focused) else {
            return nil
        }

        let selectionRange = rangeAttribute(focused, kAXSelectedTextRangeAttribute)
        var selectedText = stringAttribute(focused, kAXSelectedTextAttribute)
        if ContextExtractor.normalize(selectedText ?? "").isEmpty, let selectionRange {
            let recoveredRange = NSRange(
                location: selectionRange.location,
                length: min(selectionRange.length, maxRecoveredSelectionLength)
            )
            selectedText = string(for: recoveredRange, in: focused)
        }
        guard let selectedText else { return nil }

        let textContext = readTextContext(in: focused, selectionRange: selectionRange)
        guard let extracted = ContextExtractor.extract(
            selectedText: selectedText,
            sourceText: textContext?.text,
            selectedRange: textContext?.range
        ) else {
            return nil
        }

        let window = elementAttribute(focused, kAXWindowAttribute)
            ?? elementAttribute(application, kAXFocusedWindowAttribute)
        let title = window.flatMap { stringAttribute($0, kAXTitleAttribute) } ?? ""
        let url = urlAttribute(focused) ?? window.flatMap { urlAttribute($0) }
        let anchor = selectionAnchor(
            focused: focused,
            selectionRange: selectionRange,
            fallback: fallbackAnchor
        )

        return SelectionContext(
            selectionFull: extracted.selectionFull,
            promptSelection: extracted.promptSelection,
            truncated: extracted.truncated,
            paragraph: extracted.paragraph,
            before: extracted.before,
            after: extracted.after,
            sourceAppName: source.name,
            sourceBundleID: source.bundleID,
            windowTitle: ContextExtractor.normalize(title),
            url: url,
            quality: extracted.quality,
            anchor: anchor
        )
    }

    private func readTextContext(
        in element: AXUIElement,
        selectionRange: NSRange?
    ) -> (text: String, range: NSRange)? {
        guard let selectionRange, selectionRange.location >= 0, selectionRange.length > 0,
              let total = integerAttribute(element, kAXNumberOfCharactersAttribute), total >= 0,
              selectionRange.location <= total,
              selectionRange.length <= total - selectionRange.location else {
            return nil
        }

        if selectionRange.length <= maxParameterizedSelectionLength {
            let start = max(0, selectionRange.location - contextRadius)
            let end = min(total, NSMaxRange(selectionRange) + contextRadius)
            let windowRange = NSRange(location: start, length: end - start)
            if let text = string(for: windowRange, in: element) {
                let adjustedRange = NSRange(
                    location: selectionRange.location - start,
                    length: selectionRange.length
                )
                if adjustedRange.location <= (text as NSString).length,
                   adjustedRange.length <= (text as NSString).length - adjustedRange.location {
                    return (text, adjustedRange)
                }
            }
        }

        if total <= maxValueCharacters, let value = stringAttribute(element, kAXValueAttribute) {
            return (value, selectionRange)
        }
        return nil
    }

    private func isSecure(_ element: AXUIElement) -> Bool {
        let role = stringAttribute(element, kAXRoleAttribute) ?? ""
        let subrole = stringAttribute(element, kAXSubroleAttribute) ?? ""
        if role == "AXSecureTextField" || subrole == "AXSecureTextField"
            || role == "AXPasswordField" || subrole == "AXPasswordField" {
            return true
        }
        let description = (stringAttribute(element, kAXRoleDescriptionAttribute) ?? "").lowercased()
        return description.contains("secure") || description.contains("password")
    }

    private func selectionAnchor(
        focused: AXUIElement,
        selectionRange: NSRange?,
        fallback: SelectionAnchor?
    ) -> SelectionAnchor? {
        if let selectionRange, selectionRange.length > 0,
           let bounds = bounds(for: selectionRange, in: focused), isUsable(bounds) {
            return SelectionAnchor(rect: bounds)
        }
        if let position = pointAttribute(focused, kAXPositionAttribute),
           let size = sizeAttribute(focused, kAXSizeAttribute) {
            let frame = CGRect(origin: position, size: size)
            if isUsable(frame) {
                return SelectionAnchor(rect: frame)
            }
        }
        return fallback
    }

    private func string(for range: NSRange, in element: AXUIElement) -> String? {
        var cfRange = CFRange(location: range.location, length: range.length)
        guard let rangeValue = AXValueCreate(.cfRange, &cfRange) else { return nil }
        var result: CFTypeRef?
        let error = AXUIElementCopyParameterizedAttributeValue(
            element,
            kAXStringForRangeParameterizedAttribute as CFString,
            rangeValue,
            &result
        )
        guard error == .success else { return nil }
        return result as? String
    }

    private func bounds(for range: NSRange, in element: AXUIElement) -> CGRect? {
        var cfRange = CFRange(location: range.location, length: range.length)
        guard let rangeValue = AXValueCreate(.cfRange, &cfRange) else { return nil }
        var result: CFTypeRef?
        let error = AXUIElementCopyParameterizedAttributeValue(
            element,
            kAXBoundsForRangeParameterizedAttribute as CFString,
            rangeValue,
            &result
        )
        guard error == .success, let result, CFGetTypeID(result) == AXValueGetTypeID() else {
            return nil
        }
        let axValue = result as! AXValue
        var rect = CGRect.zero
        guard AXValueGetType(axValue) == .cgRect,
              AXValueGetValue(axValue, .cgRect, &rect) else {
            return nil
        }
        return rect
    }

    private func elementAttribute(_ element: AXUIElement, _ name: String) -> AXUIElement? {
        guard let value = copyAttribute(element, name), CFGetTypeID(value) == AXUIElementGetTypeID() else {
            return nil
        }
        return (value as! AXUIElement)
    }

    private func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
        copyAttribute(element, name) as? String
    }

    private func integerAttribute(_ element: AXUIElement, _ name: String) -> Int? {
        (copyAttribute(element, name) as? NSNumber)?.intValue
    }

    private func rangeAttribute(_ element: AXUIElement, _ name: String) -> NSRange? {
        guard let value = copyAttribute(element, name), CFGetTypeID(value) == AXValueGetTypeID() else {
            return nil
        }
        let axValue = value as! AXValue
        var range = CFRange(location: kCFNotFound, length: 0)
        guard AXValueGetType(axValue) == .cfRange,
              AXValueGetValue(axValue, .cfRange, &range),
              range.location != kCFNotFound, range.location >= 0, range.length >= 0 else {
            return nil
        }
        return NSRange(location: range.location, length: range.length)
    }

    private func pointAttribute(_ element: AXUIElement, _ name: String) -> CGPoint? {
        guard let value = copyAttribute(element, name), CFGetTypeID(value) == AXValueGetTypeID() else {
            return nil
        }
        let axValue = value as! AXValue
        var point = CGPoint.zero
        guard AXValueGetType(axValue) == .cgPoint,
              AXValueGetValue(axValue, .cgPoint, &point) else {
            return nil
        }
        return point
    }

    private func sizeAttribute(_ element: AXUIElement, _ name: String) -> CGSize? {
        guard let value = copyAttribute(element, name), CFGetTypeID(value) == AXValueGetTypeID() else {
            return nil
        }
        let axValue = value as! AXValue
        var size = CGSize.zero
        guard AXValueGetType(axValue) == .cgSize,
              AXValueGetValue(axValue, .cgSize, &size) else {
            return nil
        }
        return size
    }

    private func urlAttribute(_ element: AXUIElement) -> String? {
        guard let value = copyAttribute(element, kAXURLAttribute) else { return nil }
        if let url = value as? URL {
            return url.absoluteString
        }
        if let string = value as? String, !string.isEmpty {
            return string
        }
        return nil
    }

    private func copyAttribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        var value: CFTypeRef?
        let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
        guard error == .success else { return nil }
        return value
    }

    private func isUsable(_ rect: CGRect) -> Bool {
        rect.origin.x.isFinite && rect.origin.y.isFinite
            && rect.width.isFinite && rect.height.isFinite
            && rect.width >= 0 && rect.height >= 0
    }
}
