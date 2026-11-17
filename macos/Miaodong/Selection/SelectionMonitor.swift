import AppKit
import ApplicationServices
import Foundation

struct SelectionSource: Equatable, Sendable {
    var pid: pid_t
    var bundleID: String
    var name: String

    init(pid: pid_t, bundleID: String, name: String) {
        self.pid = pid
        self.bundleID = bundleID
        self.name = name
    }
}

enum SelectionEventLogic {
    static func shouldCapture(dragDistance: Double, clickCount: Int) -> Bool {
        dragDistance > 3 || clickCount >= 2
    }

    static func dragDistance(from start: CGPoint, to end: CGPoint) -> Double {
        hypot(end.x - start.x, end.y - start.y)
    }

    static func axPoint(fromCocoaPoint point: CGPoint, primaryScreenHeight: CGFloat) -> CGPoint {
        CGPoint(x: point.x, y: primaryScreenHeight - point.y)
    }
}

@MainActor
final class SelectionMonitor {
    var onCandidate: (SelectionContext) -> Void = { _ in }
    var onExternalInteraction: () -> Void = {}

    var isEnabled = true {
        didSet {
            guard isEnabled != oldValue else { return }
            permissionState = AXIsProcessTrusted()
            invalidate(notify: true)
        }
    }

    var excludedAppBundleIDs: Set<String> = [] {
        didSet { invalidate(notify: true) }
    }

    private let reader: AccessibilityReader
    private let ownPID = ProcessInfo.processInfo.processIdentifier
    private let ownBundleID = Bundle.main.bundleIdentifier ?? ""
    private var globalMonitor: Any?
    private var activationObserver: NSObjectProtocol?
    private var captureTask: Task<Void, Never>?
    private var operationID: UInt = 0
    private var mouseDownPoint: CGPoint?
    private var mouseDownClickCount = 0
    private var permissionState: Bool

    init(reader: AccessibilityReader = AccessibilityReader()) {
        self.reader = reader
        permissionState = AXIsProcessTrusted()
    }

    deinit {
        if let globalMonitor {
            NSEvent.removeMonitor(globalMonitor)
        }
        if let activationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(activationObserver)
        }
        captureTask?.cancel()
    }

    func start() {
        guard globalMonitor == nil, activationObserver == nil else { return }
        permissionState = AXIsProcessTrusted()
        globalMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .leftMouseUp]
        ) { [weak self] event in
            Task { @MainActor in
                self?.handle(event)
            }
        }
        activationObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleApplicationActivation()
            }
        }
    }

    func stop() {
        if let globalMonitor {
            NSEvent.removeMonitor(globalMonitor)
            self.globalMonitor = nil
        }
        if let activationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(activationObserver)
            self.activationObserver = nil
        }
        invalidate(notify: true)
    }

    /// AppState 在权限设置返回或权限状态刷新时调用，使已排队和已展示的候选失效。
    func accessibilityPermissionDidChange() {
        permissionState = AXIsProcessTrusted()
        invalidate(notify: true)
    }

    private func handle(_ event: NSEvent) {
        synchronizePermissionState()
        switch event.type {
        case .leftMouseDown:
            invalidate(notify: true)
            mouseDownPoint = NSEvent.mouseLocation
            mouseDownClickCount = event.clickCount
        case .leftMouseUp:
            guard let downPoint = mouseDownPoint else {
                invalidate(notify: false)
                return
            }
            let downClickCount = mouseDownClickCount
            let upPoint = NSEvent.mouseLocation
            invalidate(notify: false)
            guard isEnabled, permissionState, let source = currentSource(), isEligible(source) else {
                return
            }
            let distance = SelectionEventLogic.dragDistance(from: downPoint, to: upPoint)
            let clickCount = max(downClickCount, event.clickCount)
            guard SelectionEventLogic.shouldCapture(dragDistance: distance, clickCount: clickCount) else {
                return
            }
            scheduleCapture(source: source, mouseLocation: upPoint)
        default:
            break
        }
    }

    private func scheduleCapture(source: SelectionSource, mouseLocation: CGPoint) {
        operationID &+= 1
        let id = operationID
        let capturedPermissionState = permissionState
        let primaryHeight = NSScreen.screens.first?.frame.height ?? 0
        let axPoint = SelectionEventLogic.axPoint(
            fromCocoaPoint: mouseLocation,
            primaryScreenHeight: primaryHeight
        )
        let fallbackAnchor = SelectionAnchor(x: axPoint.x, y: axPoint.y)
        captureTask?.cancel()
        captureTask = Task { [reader, weak self] in
            do {
                try await Task.sleep(nanoseconds: 150_000_000)
            } catch {
                return
            }
            guard let self, !Task.isCancelled, self.operationID == id else { return }
            guard self.isEnvironmentValid(source: source, permissionState: capturedPermissionState) else {
                self.invalidate(notify: true)
                return
            }

            let context = await reader.readSelection(source: source, fallbackAnchor: fallbackAnchor)
            guard !Task.isCancelled, self.operationID == id else { return }
            guard self.isEnvironmentValid(source: source, permissionState: capturedPermissionState) else {
                self.invalidate(notify: true)
                return
            }
            self.captureTask = nil
            if let context {
                self.onCandidate(context)
            }
        }
    }

    private func handleApplicationActivation() {
        permissionState = AXIsProcessTrusted()
        invalidate(notify: true)
    }

    private func synchronizePermissionState() {
        let current = AXIsProcessTrusted()
        if current != permissionState {
            permissionState = current
            invalidate(notify: true)
        }
    }

    private func isEnvironmentValid(source: SelectionSource, permissionState expectedPermission: Bool) -> Bool {
        isEnabled
            && permissionState == expectedPermission
            && AXIsProcessTrusted() == expectedPermission
            && expectedPermission
            && currentSource() == source
            && isEligible(source)
    }

    private func currentSource() -> SelectionSource? {
        guard let app = NSWorkspace.shared.frontmostApplication else { return nil }
        return SelectionSource(
            pid: app.processIdentifier,
            bundleID: app.bundleIdentifier ?? "",
            name: app.localizedName ?? ""
        )
    }

    private func isEligible(_ source: SelectionSource) -> Bool {
        if source.pid == ownPID || (!ownBundleID.isEmpty && source.bundleID == ownBundleID) {
            return false
        }
        return source.bundleID.isEmpty || !excludedAppBundleIDs.contains(source.bundleID)
    }

    private func invalidate(notify: Bool) {
        operationID &+= 1
        captureTask?.cancel()
        captureTask = nil
        mouseDownPoint = nil
        mouseDownClickCount = 0
        if notify {
            onExternalInteraction()
        }
    }
}
