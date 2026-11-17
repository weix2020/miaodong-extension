import CoreGraphics
import Foundation
import XCTest
@testable import Miaodong

final class SelectionTests: XCTestCase {
    func testLongSelectionIsBoundedAndMarkedTruncated() throws {
        let selected = String(repeating: "长", count: 2400)
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: selected,
            sourceText: nil,
            selectedRange: nil
        ))

        XCTAssertEqual(result.selectionFull.count, 1800)
        XCTAssertEqual(result.promptSelection.count, 600)
        XCTAssertTrue(result.truncated)
        XCTAssertEqual(result.quality, .axSelectionOnly)
        XCTAssertTrue(result.paragraph.isEmpty)
        XCTAssertTrue(result.before.isEmpty)
        XCTAssertTrue(result.after.isEmpty)
    }

    func testParagraphBoundariesAndSurroundingTextUseSuppliedRange() throws {
        let text = "前文段落\nAlpha target omega\n后文段落"
        let range = (text as NSString).range(of: "target")
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "target",
            sourceText: text,
            selectedRange: range
        ))

        XCTAssertEqual(result.quality, .axParagraph)
        XCTAssertEqual(result.paragraph, "Alpha target omega")
        XCTAssertEqual(result.before, "前文段落\nAlpha")
        XCTAssertEqual(result.after, "omega\n后文段落")
    }

    func testLongParagraphIsCenteredOnSelectionAndSideContextIsBounded() throws {
        let prefix = String(repeating: "前", count: 1500)
        let suffix = String(repeating: "后", count: 1500)
        let text = prefix + "重点" + suffix
        let range = NSRange(location: (prefix as NSString).length, length: 2)
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "重点",
            sourceText: text,
            selectedRange: range
        ))

        XCTAssertEqual(result.quality, .axParagraph)
        XCTAssertEqual(result.paragraph.count, 1800)
        XCTAssertTrue(result.paragraph.contains("重点"))
        XCTAssertEqual(result.before, String(repeating: "前", count: 400))
        XCTAssertEqual(result.after, String(repeating: "后", count: 400))
        XCTAssertEqual(result.before.count, 400)
        XCTAssertEqual(result.after.count, 400)
    }

    func testRepeatedSelectionWithoutRangeDoesNotGuessLocation() throws {
        let text = "target 第一次\n中间文字\ntarget 第二次"
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "target",
            sourceText: text,
            selectedRange: nil
        ))

        XCTAssertEqual(result.selectionFull, "target")
        XCTAssertEqual(result.quality, .axSelectionOnly)
        XCTAssertTrue(result.paragraph.isEmpty)
        XCTAssertTrue(result.before.isEmpty)
        XCTAssertTrue(result.after.isEmpty)
    }

    func testSelectionOnlyWhenTextContainerIsUnavailable() throws {
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "selection",
            sourceText: nil,
            selectedRange: NSRange(location: 0, length: 9)
        ))

        XCTAssertEqual(result.quality, .axSelectionOnly)
        XCTAssertEqual(result.paragraph, "")
        XCTAssertEqual(result.before, "")
        XCTAssertEqual(result.after, "")
    }

    func testMeaninglessSelectionIsRejected() throws {
        XCTAssertNil(ContextExtractor.extract(
            selectedText: " \n\t— … 。！？ ",
            sourceText: nil,
            selectedRange: nil
        ))
        XCTAssertNil(ContextExtractor.extract(
            selectedText: " \r\n\t ",
            sourceText: nil,
            selectedRange: nil
        ))

        let meaningful = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "  版本 42  ",
            sourceText: nil,
            selectedRange: nil
        ))
        XCTAssertEqual(meaningful.selectionFull, "版本 42")
        XCTAssertFalse(meaningful.truncated)
    }

    func testUTF16RangeHandlesEmojiChineseAndCanonicalNormalization() throws {
        let text = "前文😀\n甲乙 中文 丙丁\n后续"
        let range = (text as NSString).range(of: "中文")
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "中文",
            sourceText: text,
            selectedRange: range
        ))

        XCTAssertEqual(result.paragraph, "甲乙 中文 丙丁")
        XCTAssertEqual(result.before, "前文😀\n甲乙")
        XCTAssertEqual(result.after, "丙丁\n后续")

        let normalized = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "cafe\u{301}",
            sourceText: nil,
            selectedRange: nil
        ))
        XCTAssertEqual(normalized.selectionFull, "café")
    }

    func testWhitespaceNormalizationMatchesSelectionRules() throws {
        let result = try XCTUnwrap(ContextExtractor.extract(
            selectedText: "\u{00A0}  术语  \n\n\n下文",
            sourceText: nil,
            selectedRange: nil
        ))
        XCTAssertEqual(result.selectionFull, "术语\n\n下文")
    }

    func testDragAndMultipleClickCaptureRules() {
        XCTAssertFalse(SelectionEventLogic.shouldCapture(dragDistance: 0, clickCount: 1))
        XCTAssertFalse(SelectionEventLogic.shouldCapture(dragDistance: 3, clickCount: 1))
        XCTAssertTrue(SelectionEventLogic.shouldCapture(dragDistance: 3.01, clickCount: 1))
        XCTAssertTrue(SelectionEventLogic.shouldCapture(dragDistance: 0, clickCount: 2))
        XCTAssertTrue(SelectionEventLogic.shouldCapture(dragDistance: 0, clickCount: 3))
        XCTAssertEqual(
            SelectionEventLogic.dragDistance(from: CGPoint(x: 0, y: 0), to: CGPoint(x: 3, y: 4)),
            5
        )
    }

    func testMouseLocationUsesAXTopLeftOrigin() {
        let converted = SelectionEventLogic.axPoint(
            fromCocoaPoint: CGPoint(x: 333.5, y: 200),
            primaryScreenHeight: 900
        )
        XCTAssertEqual(converted.x, 333.5)
        XCTAssertEqual(converted.y, 700)

        let anchor = SelectionAnchor(x: converted.x, y: converted.y)
        XCTAssertEqual(anchor.rect, CGRect(x: 333.5, y: 700, width: 0, height: 0))
    }
}
