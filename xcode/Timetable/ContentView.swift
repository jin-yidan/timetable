//
//  ContentView.swift
//  Timetable
//
//  Created by 晋艺丹 on 18/01/2026.
//
import SwiftUI
import WebKit

class WebViewCoordinator {
    let calendarSyncManager = CalendarSyncManager()
    let cloudSyncManager = CloudSyncManager()
}

#if os(macOS)
struct WebView: NSViewRepresentable {
    let url: URL
    let coordinator = WebViewCoordinator()

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        config.userContentController.add(coordinator.calendarSyncManager, name: "calendarSync")
        config.userContentController.add(coordinator.cloudSyncManager, name: "cloudSync")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.setValue(false, forKey: "drawsBackground")

        coordinator.calendarSyncManager.webView = webView
        coordinator.cloudSyncManager.webView = webView

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        nsView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
}

class WidgetController: NSObject, NSWindowDelegate {
}

struct ContentView: View {
    let localPath: URL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebResources")!
    let controller = WidgetController()

    var body: some View {
        WebView(url: localPath)
            .edgesIgnoringSafeArea(.all)
            .onAppear {
                NSApp.setActivationPolicy(.accessory)

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    configureWidget()
                }
            }
    }

    func configureWidget() {
        let windows = NSApplication.shared.windows
        if windows.count > 1 {
            for i in 1..<windows.count {
                windows[i].close()
            }
        }

        if let window = NSApplication.shared.windows.first {
            window.delegate = controller

            window.styleMask = [.titled, .resizable, .fullSizeContentView, .miniaturizable, .closable]
            window.titleVisibility = .hidden
            window.titlebarAppearsTransparent = true

            window.setIsVisible(true)

            window.collectionBehavior = [.fullScreenPrimary, .moveToActiveSpace]
            window.backgroundColor = .clear
            window.isMovableByWindowBackground = true

            let menu = NSMenu()
            menu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m"))
            menu.addItem(NSMenuItem(title: "Exit Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"))
            menu.addItem(NSMenuItem.separator())
            menu.addItem(NSMenuItem(title: "Close Widget", action: #selector(NSWindow.close), keyEquivalent: "w"))
            window.contentView?.menu = menu

            window.makeKeyAndOrderFront(nil)
        }
    }
}

#else // iOS

struct WebView: UIViewRepresentable {
    let url: URL
    let coordinator = WebViewCoordinator()

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        config.userContentController.add(coordinator.calendarSyncManager, name: "calendarSync")
        config.userContentController.add(coordinator.cloudSyncManager, name: "cloudSync")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        coordinator.calendarSyncManager.webView = webView
        coordinator.cloudSyncManager.webView = webView

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        uiView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
}

struct ContentView: View {
    let localPath: URL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebResources")!

    var body: some View {
        WebView(url: localPath)
            .ignoresSafeArea()
    }
}

#endif
