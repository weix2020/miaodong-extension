import Foundation

struct ChatClientError: LocalizedError, Equatable {
    let status: Int
    let message: String

    var errorDescription: String? { message }
}

@MainActor
protocol ChatStreaming: AnyObject {
    func streamChat(
        settings: AppSettings,
        apiKey: String,
        messages: [ChatMessage],
        maxTokens: Int,
        onDelta: @escaping (String) -> Void
    ) async throws

    func testConnection(settings: AppSettings, apiKey: String) async throws -> String
}

extension ChatStreaming {
    func testConnection(settings: AppSettings, apiKey: String) async throws -> String {
        var text = ""
        try await streamChat(
            settings: settings,
            apiKey: apiKey,
            messages: [
                ChatMessage(role: .system, content: "你是接口测试。只回复小写字母 ok，不要加别的字。"),
                ChatMessage(role: .user, content: "ping")
            ],
            maxTokens: 32
        ) { delta in
            text += delta
        }
        let result = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40))
        guard !result.isEmpty else {
            throw ChatClientError(status: 0, message: "接口没有返回文字。")
        }
        return result
    }
}

struct SSEParser {
    private var buffer = Data()

    @discardableResult
    mutating func append(_ byte: UInt8, onDelta: (String) -> Void) -> Bool {
        if byte == 0x0A {
            return processLine(&buffer, onDelta: onDelta)
        }
        buffer.append(byte)
        return false
    }

    mutating func finish(onDelta: (String) -> Void) {
        guard !buffer.isEmpty else { return }
        _ = processLine(&buffer, onDelta: onDelta)
        buffer.removeAll(keepingCapacity: false)
    }

    private func processLine(_ data: inout Data, onDelta: (String) -> Void) -> Bool {
        defer { data.removeAll(keepingCapacity: true) }
        var lineData = data
        if lineData.last == 0x0D {
            lineData.removeLast()
        }
        guard let line = String(data: lineData, encoding: .utf8) else { return false }
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("data:") else { return false }
        let payload = trimmed.dropFirst(5).trimmingCharacters(in: .whitespacesAndNewlines)
        if payload.isEmpty { return false }
        if payload == "[DONE]" { return true }
        guard let data = payload.data(using: .utf8),
              let content = ChatClient.content(from: data) else { return false }
        if !content.isEmpty { onDelta(content) }
        return false
    }
}

@MainActor
final class ChatClient: ChatStreaming {
    static let networkErrorMessage = "连不上接口。请检查 Base URL、网络、代理或防火墙设置。"

    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func streamChat(
        settings: AppSettings,
        apiKey: String,
        messages: [ChatMessage],
        maxTokens: Int = 700,
        onDelta: @escaping (String) -> Void
    ) async throws {
        let settings = ProviderPresets.normalized(settings)
        let key = ProviderPresets.normalizeAPIKey(apiKey)
        guard !settings.baseUrl.isEmpty else {
            throw ChatClientError(status: 0, message: "还没有填写接口地址。")
        }
        guard !key.isEmpty else {
            throw ChatClientError(status: 0, message: "还没有填写 API Key。")
        }
        guard !settings.model.isEmpty else {
            throw ChatClientError(status: 0, message: "还没有填写模型名。豆包请填接入点 ID（ep- 开头）。")
        }
        guard !messages.isEmpty else {
            throw ChatClientError(status: 0, message: "没有要解释的内容。")
        }
        let outgoingMessages = messages.prefix(16)
        guard outgoingMessages.allSatisfy({ !$0.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
            throw ChatClientError(status: 0, message: "请求格式不对，消息内容不能为空。")
        }
        guard let url = URL(string: "\(settings.baseUrl)/chat/completions") else {
            throw ChatClientError(status: 0, message: "Base URL 不是有效的接口地址。")
        }

        let sanitizedMessages = outgoingMessages.map { message in
            [
                "role": message.role.rawValue,
                "content": String(message.content.prefix(8000))
            ]
        }
        var payload: [String: Any] = [
            "model": settings.model,
            "messages": sanitizedMessages,
            "temperature": 0.3,
            "max_tokens": maxTokens,
            "stream": true
        ]

        do {
            var (bytes, response) = try await session.bytes(for: try makeRequest(
                url: url,
                apiKey: key,
                payload: payload
            ))
            var httpResponse = try requireHTTPResponse(response)

            if httpResponse.statusCode == 400 {
                let body = String(decoding: try await readData(bytes), as: UTF8.self)
                var changed = false
                if body.range(of: "temperature", options: .caseInsensitive) != nil {
                    payload.removeValue(forKey: "temperature")
                    changed = true
                }
                if body.range(of: "max_tokens", options: .caseInsensitive) != nil {
                    payload.removeValue(forKey: "max_tokens")
                    changed = true
                }
                guard changed else {
                    throw Self.httpError(status: 400, body: body, apiKey: key)
                }
                try Task.checkCancellation()
                (bytes, response) = try await session.bytes(for: try makeRequest(
                    url: url,
                    apiKey: key,
                    payload: payload
                ))
                httpResponse = try requireHTTPResponse(response)
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                let body = String(decoding: try await readData(bytes), as: UTF8.self)
                throw Self.httpError(status: httpResponse.statusCode, body: body, apiKey: key)
            }

            let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
            if contentType.contains("application/json") {
                let data = try await readData(bytes)
                if let content = Self.content(from: data), !content.isEmpty {
                    onDelta(content)
                }
                return
            }

            var parser = SSEParser()
            for try await byte in bytes {
                if parser.append(byte, onDelta: onDelta) { return }
            }
            parser.finish(onDelta: onDelta)
        } catch {
            if Self.isCancellation(error) { throw CancellationError() }
            if let error = error as? ChatClientError { throw error }
            throw ChatClientError(status: 0, message: Self.networkErrorMessage)
        }
    }

    static func userMessage(for error: Error, apiKey: String = "") -> String {
        if isCancellation(error) { return "" }
        let message: String
        if let error = error as? ChatClientError {
            message = error.message
        } else if error is URLError {
            message = networkErrorMessage
        } else {
            message = error.localizedDescription.isEmpty ? "解释失败了。" : error.localizedDescription
        }
        return redact(message, apiKey: apiKey)
    }

    static func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if let error = error as? URLError, error.code == .cancelled { return true }
        let nsError = error as NSError
        return nsError.domain == NSURLErrorDomain && nsError.code == URLError.cancelled.rawValue
    }

    nonisolated fileprivate static func content(from data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data),
              let json = object as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let choice = choices.first else { return nil }
        if let delta = choice["delta"] as? [String: Any], let content = delta["content"] as? String {
            return content
        }
        if let message = choice["message"] as? [String: Any] {
            return message["content"] as? String
        }
        return nil
    }

    private func makeRequest(url: URL, apiKey: String, payload: [String: Any]) throws -> URLRequest {
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        return request
    }

    private func requireHTTPResponse(_ response: URLResponse) throws -> HTTPURLResponse {
        guard let response = response as? HTTPURLResponse else {
            throw ChatClientError(status: 0, message: "接口返回了无法识别的响应。")
        }
        return response
    }

    private func readData(_ bytes: URLSession.AsyncBytes) async throws -> Data {
        var data = Data()
        for try await byte in bytes {
            data.append(byte)
        }
        return data
    }

    private static func httpError(status: Int, body: String, apiKey: String) -> ChatClientError {
        let snippet = String(redact(snippetFromBody(body), apiKey: apiKey).prefix(180))
        let message: String
        switch status {
        case 401, 403:
            message = "密钥被拒绝（\(status)）。请检查 API Key；豆包还要确认模型栏填的是接入点 ID。"
        case 404:
            message = "找不到接口（404）。Base URL 应停在 /v1 或 /v3，不要自己加上 /chat/completions。"
        case 429:
            message = "请求太频繁，或额度用完了。稍后再试。"
        case 400:
            message = "请求被拒绝（400）：\(snippet.isEmpty ? "参数不被这个接口接受。" : snippet)"
        case 0:
            message = snippet.isEmpty ? "请求还没发出去。" : snippet
        default:
            message = "接口错误（\(status)）\(snippet.isEmpty ? "" : "：\(snippet)")"
        }
        return ChatClientError(status: status, message: message)
    }

    private static func snippetFromBody(_ body: String) -> String {
        var raw = body
        if let data = body.data(using: .utf8),
           let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let error = object["error"] as? [String: Any]
            if let value = error?["message"] as? String ?? object["message"] as? String {
                raw = value
            }
        }
        let collapsed = raw.replacingOccurrences(
            of: "\\s+",
            with: " ",
            options: .regularExpression
        )
        return collapsed
    }

    private static func redact(_ text: String, apiKey: String) -> String {
        var result = text
        let keys = [apiKey, ProviderPresets.normalizeAPIKey(apiKey)]
        for key in keys where !key.isEmpty {
            result = result.replacingOccurrences(of: key, with: "[已隐藏]")
        }
        return result.replacingOccurrences(
            of: "Bearer\\s+[^\\s,;\\\"]+",
            with: "Bearer [已隐藏]",
            options: [.regularExpression, .caseInsensitive]
        )
    }
}
