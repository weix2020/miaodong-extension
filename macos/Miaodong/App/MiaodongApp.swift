import AppKit
import SwiftUI

@main
@MainActor
struct MiaodongApp: App {
    @StateObject private var model = AppState()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(model)
        } label: {
            Text("懂")
                .font(.system(size: 15, weight: .bold))
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
                .environmentObject(model)
        }
    }
}

private struct MenuBarView: View {
    @EnvironmentObject private var model: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            if model.showsPrivacyNotice {
                VStack(alignment: .leading, spacing: 7) {
                    Text("划词只显示「懂」，点击后才发送")
                        .font(.headline)
                    Text("授权后，秒懂仅在划词时读取选区及可获得的附近文本；不会读取密码字段。未点击前不会请求模型。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("知道了", action: model.dismissPrivacyNotice)
                }
                .padding(9)
                .background(Color.accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            }

            Toggle(
                "划词后显示「懂」",
                isOn: Binding(
                    get: { model.settings.enabled },
                    set: model.setEnabled
                )
            )

            HStack {
                Label(
                    model.accessibilityGranted ? "辅助功能已授权" : "需要辅助功能权限",
                    systemImage: model.accessibilityGranted ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
                )
                .font(.caption)
                .foregroundStyle(model.accessibilityGranted ? .green : .orange)
                Spacer()
                if !model.accessibilityGranted {
                    Button("授权", action: model.requestAccessibilityPermission)
                }
            }

            Button("解释已复制文字", action: model.explainClipboard)
            Text("仅在点击此命令时读取纯文本剪贴板，不自动复制。")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let message = model.menuMessage, !message.isEmpty {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Divider()
            Text("最近记录")
                .font(.caption)
                .foregroundStyle(.secondary)
            if model.history.isEmpty {
                Text("暂无成功解释")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(Array(model.history.prefix(5))) { entry in
                    Button {
                        model.openHistory(entry)
                    } label: {
                        HStack {
                            Text(entry.term.isEmpty ? "（无选区）" : entry.term)
                                .lineLimit(1)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }

            Divider()
            SettingsLink {
                Label("设置…", systemImage: "gearshape")
            }
            .keyboardShortcut(",", modifiers: [.command])
            Button("退出秒懂") {
                NSApplication.shared.terminate(nil)
            }
            .keyboardShortcut("q", modifiers: [.command])
        }
        .padding(12)
        .frame(width: 320)
        .onAppear(perform: model.refreshAccessibilityPermission)
    }
}
