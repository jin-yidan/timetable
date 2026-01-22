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
}

struct WebView: NSViewRepresentable {
    let url: URL
    let coordinator = WebViewCoordinator()

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // Add calendar sync message handler
        config.userContentController.add(coordinator.calendarSyncManager, name: "calendarSync")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.setValue(false, forKey: "drawsBackground")

        // Set webView reference for callback
        coordinator.calendarSyncManager.webView = webView

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        nsView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
}

class WidgetController: NSObject, NSWindowDelegate {
}

struct ContentView: View {
    // Make sure this path is correct for your Mac
    let localPath = URL(fileURLWithPath: "/Users/jinyidan/Desktop/projects/timetable/index.html")
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
        // Close any extra windows, keep only one
        let windows = NSApplication.shared.windows
        if windows.count > 1 {
            for i in 1..<windows.count {
                windows[i].close()
            }
        }

        if let window = NSApplication.shared.windows.first {
            window.delegate = controller

            // Allow dragging, resizing, and fullscreen
            window.styleMask = [.titled, .resizable, .fullSizeContentView, .miniaturizable, .closable]
            window.titleVisibility = .hidden
            window.titlebarAppearsTransparent = true

            window.setIsVisible(true)

            // Enable fullscreen and allow joining all spaces
            window.collectionBehavior = [.fullScreenPrimary, .canJoinAllSpaces]
            window.backgroundColor = .clear
            window.isMovableByWindowBackground = true

            // Right-click menu
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
