import AppKit
import SwiftUI
import WebKit

@MainActor
final class BundledWebSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "worldseed"

    private let webRoot: URL

    init(webRoot: URL) {
        self.webRoot = webRoot.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              requestURL.scheme == Self.scheme,
              let fileURL = resolvedFileURL(for: requestURL) else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        do {
            let data = try Data(contentsOf: fileURL, options: [.mappedIfSafe])
            let mimeType = Self.mimeType(for: fileURL.pathExtension)
            let response = URLResponse(
                url: requestURL,
                mimeType: mimeType,
                expectedContentLength: data.count,
                textEncodingName: Self.isTextMimeType(mimeType) ? "utf-8" : nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func resolvedFileURL(for requestURL: URL) -> URL? {
        guard requestURL.host == "app" else { return nil }

        let relativePath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let resourcePath = relativePath.isEmpty ? "index.html" : relativePath
        let candidate = webRoot.appendingPathComponent(resourcePath).standardizedFileURL
        let rootPath = webRoot.path.hasSuffix("/") ? webRoot.path : webRoot.path + "/"

        guard candidate.path.hasPrefix(rootPath),
              FileManager.default.fileExists(atPath: candidate.path) else {
            return nil
        }

        return candidate
    }

    private static func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html", "htm": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json", "map": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        case "ico": return "image/x-icon"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "wasm": return "application/wasm"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "ogg": return "audio/ogg"
        default: return "application/octet-stream"
        }
    }

    private static func isTextMimeType(_ mimeType: String) -> Bool {
        mimeType.hasPrefix("text/") || mimeType == "application/json" || mimeType == "image/svg+xml"
    }
}

@MainActor
final class WorldseedWebCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandler {
    var schemeHandler: BundledWebSchemeHandler?

    private var runtimeErrors: [String] = []
    private var smokeCompleted = false
    private var showedRuntimeFailure = false
    private let smokeFilePath = ProcessInfo.processInfo.environment["WORLDSEED_NATIVE_SMOKE_FILE"]

    func attach(to webView: WKWebView) {
        webView.navigationDelegate = self
        webView.uiDelegate = self
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "worldseedNative" else { return }
        let body = String(describing: message.body)

        if body.hasPrefix("JS_ERROR:") || body.hasPrefix("PROMISE_ERROR:") {
            runtimeErrors.append(body)
            fputs("WORLDSEED native web runtime: \(body)\n", stderr)
            return
        }

        if body == "PASS" {
            if runtimeErrors.isEmpty {
                completeSmoke(with: "PASS")
            } else {
                completeSmoke(with: "FAIL\n" + runtimeErrors.joined(separator: "\n"))
            }
            return
        }

        if body.hasPrefix("ROOT_TIMEOUT") || body.hasPrefix("IDB_") {
            let details = ([body] + runtimeErrors).joined(separator: "\n")
            completeSmoke(with: "FAIL\n" + details)
            showRuntimeFailureIfNeeded(details)
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }

        guard let url = navigationAction.request.url,
              let scheme = url.scheme?.lowercased() else {
            decisionHandler(.allow)
            return
        }

        if [BundledWebSchemeHandler.scheme, "about", "blob", "data"].contains(scheme) {
            decisionHandler(.allow)
            return
        }

        NSWorkspace.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.canChooseFiles = !parameters.allowsDirectories
        panel.resolvesAliases = true
        panel.begin { result in
            completionHandler(result == .OK ? panel.urls : nil)
        }
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = "WORLDSEED"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = "WORLDSEED"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = "WORLDSEED"
        alert.informativeText = prompt
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")

        let field = NSTextField(string: defaultText ?? "")
        field.frame = NSRect(x: 0, y: 0, width: 320, height: 24)
        alert.accessoryView = field

        completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping (URL?) -> Void
    ) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.canCreateDirectories = true
        panel.begin { result in
            guard result == .OK, let destination = panel.url else {
                completionHandler(nil)
                return
            }

            if FileManager.default.fileExists(atPath: destination.path) {
                do {
                    try FileManager.default.removeItem(at: destination)
                } catch {
                    let alert = NSAlert(error: error)
                    alert.messageText = "WORLDSEED could not replace the selected file."
                    alert.runModal()
                    completionHandler(nil)
                    return
                }
            }

            completionHandler(destination)
        }
    }

    func downloadDidFinish(_ download: WKDownload) {}

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        let alert = NSAlert(error: error)
        alert.messageText = "WORLDSEED export failed."
        alert.runModal()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleNavigationFailure(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleNavigationFailure(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let details = "WEBKIT_PROCESS_TERMINATED"
        completeSmoke(with: "FAIL\n" + details)
        showRuntimeFailureIfNeeded(details)
    }

    private func handleNavigationFailure(_ error: Error) {
        let details = "NAVIGATION_ERROR:\(error.localizedDescription)"
        fputs("WORLDSEED native web runtime: \(details)\n", stderr)
        completeSmoke(with: "FAIL\n" + details)
        showRuntimeFailureIfNeeded(details)
    }

    private func completeSmoke(with result: String) {
        guard let smokeFilePath, !smokeCompleted else { return }
        smokeCompleted = true

        do {
            try result.write(toFile: smokeFilePath, atomically: true, encoding: .utf8)
        } catch {
            fputs("WORLDSEED could not write native smoke result: \(error.localizedDescription)\n", stderr)
        }

        DispatchQueue.main.async {
            NSApplication.shared.terminate(nil)
        }
    }

    private func showRuntimeFailureIfNeeded(_ details: String) {
        guard smokeFilePath == nil, !showedRuntimeFailure else { return }
        showedRuntimeFailure = true

        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "WORLDSEED could not start its interface."
        alert.informativeText = details + "\n\nUpdate the repository and rebuild with npm run mac."
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

struct WorldseedWebView: NSViewRepresentable {
    func makeCoordinator() -> WorldseedWebCoordinator {
        WorldseedWebCoordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()

        guard let resourceURL = Bundle.main.resourceURL else {
            return makeErrorWebView(configuration: configuration, message: "WORLDSEED could not find its application resources.")
        }

        let webRoot = resourceURL.appendingPathComponent("web", isDirectory: true).standardizedFileURL
        let indexURL = webRoot.appendingPathComponent("index.html").standardizedFileURL
        guard FileManager.default.fileExists(atPath: indexURL.path) else {
            return makeErrorWebView(configuration: configuration, message: "WORLDSEED could not find its bundled web application.")
        }

        let schemeHandler = BundledWebSchemeHandler(webRoot: webRoot)
        context.coordinator.schemeHandler = schemeHandler
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: BundledWebSchemeHandler.scheme)

        let contentController = configuration.userContentController
        contentController.add(context.coordinator, name: "worldseedNative")
        contentController.addUserScript(WKUserScript(
            source: Self.runtimeMonitorScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsMagnification = false
        context.coordinator.attach(to: webView)

        let appURL = URL(string: "\(BundledWebSchemeHandler.scheme)://app/index.html")!
        webView.load(URLRequest(url: appURL))
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    private func makeErrorWebView(configuration: WKWebViewConfiguration, message: String) -> WKWebView {
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.loadHTMLString(
            """
            <!doctype html>
            <meta charset="utf-8">
            <style>body{background:#020617;color:#e2e8f0;font:16px -apple-system;padding:48px}code{color:#7dd3fc}</style>
            <h1>\(message)</h1>
            <p>Rebuild the app from the repository with <code>npm run mac</code>.</p>
            """,
            baseURL: nil
        )
        return webView
    }

    private static let runtimeMonitorScript = #"""
    (() => {
      const post = value => {
        try { window.webkit.messageHandlers.worldseedNative.postMessage(String(value)); } catch (_) {}
      };

      window.addEventListener('error', event => {
        post(`JS_ERROR:${event.message || 'unknown'}@${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`);
      });

      window.addEventListener('unhandledrejection', event => {
        post(`PROMISE_ERROR:${String(event.reason || 'unknown')}`);
      });

      const verify = attempt => {
        const root = document.getElementById('root');
        if (root && root.childElementCount > 0) {
          try {
            const dbName = '__worldseed_native_smoke__';
            const request = indexedDB.open(dbName, 1);
            request.onblocked = () => post('IDB_BLOCKED');
            request.onerror = () => post(`IDB_ERROR:${request.error ? request.error.message : 'unknown'}`);
            request.onsuccess = () => {
              request.result.close();
              indexedDB.deleteDatabase(dbName);
              post('PASS');
            };
          } catch (error) {
            post(`IDB_EXCEPTION:${String(error)}`);
          }
          return;
        }

        if (attempt >= 100) {
          post('ROOT_TIMEOUT');
          return;
        }

        setTimeout(() => verify(attempt + 1), 100);
      };

      setTimeout(() => verify(0), 0);
    })();
    """#
}

@main
struct WorldseedMacApp: App {
    var body: some Scene {
        WindowGroup("WORLDSEED") {
            WorldseedWebView()
                .frame(minWidth: 960, minHeight: 640)
        }
        .defaultSize(width: 1440, height: 900)
    }
}
