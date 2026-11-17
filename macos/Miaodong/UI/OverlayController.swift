import AppKit
import SwiftUI

private final class OverlayPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

@MainActor
final class OverlayController {
    var onExplain: (SelectionContext) -> Void = { _ in }
    var onCloseSession: (ExplanationSession) -> Void = { _ in }

    private let triggerSize = NSSize(width: 32, height: 32)
    private let cardSize = NSSize(width: 440, height: 550)
    private var triggerPanel: NSPanel?
    private var cardPanel: NSPanel?
    private var triggerTimeout: Task<Void, Never>?

    func showTrigger(for context: SelectionContext) {
        hideTrigger()
        let panel = makePanel(size: triggerSize, resizable: false)
        let hosting = NSHostingController(rootView: TriggerView { [weak self] in
            self?.onExplain(context)
        })
        panel.contentViewController = hosting
        panel.setContentSize(triggerSize)
        panel.setFrameOrigin(triggerOrigin(for: context.anchor))
        panel.orderFrontRegardless()
        triggerPanel = panel

        triggerTimeout = Task { [weak self] in
            do {
                try await Task.sleep(nanoseconds: 6_000_000_000)
            } catch {
                return
            }
            guard !Task.isCancelled else { return }
            self?.hideTrigger()
        }
    }

    func hideTrigger() {
        triggerTimeout?.cancel()
        triggerTimeout = nil
        triggerPanel?.close()
        triggerPanel = nil
    }

    func show(session: ExplanationSession) {
        hideTrigger()
        hideCard()
        let view = ExplanationCardView(
            session: session,
            onClose: { [weak self, weak session] in
                guard let session else { return }
                self?.onCloseSession(session)
            },
            onActivate: { [weak self] in
                self?.cardPanel?.makeKey()
            }
        )
        showCard(view, anchor: session.context.anchor)
    }

    func showHistory(_ entry: HistoryEntry) {
        hideTrigger()
        hideCard()
        let view = HistoryCardView(entry: entry) { [weak self] in
            self?.hideCard()
        }
        showCard(view, anchor: nil)
    }

    func hideCard() {
        if cardPanel?.isKeyWindow == true {
            cardPanel?.resignKey()
        }
        cardPanel?.close()
        cardPanel = nil
    }

    private func showCard<Content: View>(_ view: Content, anchor: SelectionAnchor?) {
        let panel = makePanel(size: cardSize, resizable: false)
        panel.isMovableByWindowBackground = true
        let hosting = NSHostingController(rootView: view)
        panel.contentViewController = hosting
        panel.setContentSize(cardSize)
        panel.setFrameOrigin(cardOrigin(for: anchor))
        panel.orderFrontRegardless()
        cardPanel = panel
    }

    private func makePanel(size: NSSize, resizable: Bool) -> NSPanel {
        var style: NSWindow.StyleMask = [.borderless, .nonactivatingPanel]
        if resizable { style.insert(.resizable) }
        let panel = OverlayPanel(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: style,
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.animationBehavior = .utilityWindow
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        return panel
    }

    private func triggerOrigin(for anchor: SelectionAnchor?) -> NSPoint {
        let anchorRect = appKitAnchorRect(anchor)
        let screen = screen(containing: anchorRect)
        let visible = screen.visibleFrame.insetBy(dx: 6, dy: 6)
        var x = anchorRect.maxX - 3
        var y = anchorRect.maxY + 8
        if y + triggerSize.height > visible.maxY {
            y = anchorRect.minY - triggerSize.height - 8
        }
        x = clamp(x, lower: visible.minX, upper: visible.maxX - triggerSize.width)
        y = clamp(y, lower: visible.minY, upper: visible.maxY - triggerSize.height)
        return NSPoint(x: x, y: y)
    }

    private func cardOrigin(for anchor: SelectionAnchor?) -> NSPoint {
        let anchorRect = appKitAnchorRect(anchor)
        let screen = screen(containing: anchorRect)
        let visible = screen.visibleFrame.insetBy(dx: 10, dy: 10)
        var x = anchorRect.maxX + 14
        if x + cardSize.width > visible.maxX {
            x = anchorRect.minX - cardSize.width - 14
        }
        if x < visible.minX {
            x = anchorRect.midX - cardSize.width / 2
        }
        var y = anchorRect.maxY - cardSize.height
        x = clamp(x, lower: visible.minX, upper: visible.maxX - cardSize.width)
        y = clamp(y, lower: visible.minY, upper: visible.maxY - cardSize.height)
        return NSPoint(x: x, y: y)
    }

    private func appKitAnchorRect(_ anchor: SelectionAnchor?) -> CGRect {
        guard let anchor else {
            let point = NSEvent.mouseLocation
            return CGRect(x: point.x, y: point.y, width: 1, height: 1)
        }
        let primaryHeight = NSScreen.screens.first?.frame.height ?? 0
        return CGRect(
            x: anchor.x,
            y: primaryHeight - anchor.y - anchor.height,
            width: anchor.width,
            height: anchor.height
        )
    }

    private func screen(containing rect: CGRect) -> NSScreen {
        let point = CGPoint(x: rect.midX, y: rect.midY)
        return NSScreen.screens.first(where: { $0.frame.contains(point) })
            ?? NSScreen.main
            ?? NSScreen.screens[0]
    }

    private func clamp(_ value: CGFloat, lower: CGFloat, upper: CGFloat) -> CGFloat {
        guard upper >= lower else { return lower }
        return min(max(value, lower), upper)
    }
}
