import AppKit
import SwiftUI
import WebKit

@MainActor
final class WorldseedWebCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    func attach(to webView: WKWebView) {
        webView.navigationDelegate = self
        webView.uiDelegate = self
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

        if ["file", "about", "blob", "data"].contains(scheme) {
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
}

struct WorldseedWebView: NSViewRepresentable {
    func makeCoordinator() -> WorldseedWebCoordinator {
        WorldseedWebCoordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsMagnification = false
        context.coordinator.attach(to: webView)

        guard let resourceURL = Bundle.main.resourceURL else {
            showMissingBundleError(in: webView)
            return webView
        }

        let webRoot = resourceURL.appendingPathComponent("web", isDirectory: true).resolvingSymlinksInPath()
        let indexURL = webRoot.appendingPathComponent("index.html").resolvingSymlinksInPath()

        guard FileManager.default.fileExists(atPath: indexURL.path) else {
            showMissingBundleError(in: webView)
            return webView
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    private func showMissingBundleError(in webView: WKWebView) {
        webView.loadHTMLString(
            """
            <!doctype html>
            <meta charset="utf-8">
            <style>body{background:#020617;color:#e2e8f0;font:16px -apple-system;padding:48px}code{color:#7dd3fc}</style>
            <h1>WORLDSEED could not load its bundled web application.</h1>
            <p>Rebuild the app from the repository with <code>npm run build:mac</code>.</p>
            """,
            baseURL: nil
        )
    }
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
