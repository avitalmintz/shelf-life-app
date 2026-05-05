//
//  ShareViewController.swift
//  ShareExt
//
//  Created by Avital Mintz on 4/29/26.
//

import UIKit
import Social
import UniformTypeIdentifiers
import UserNotifications

class ShareViewController: SLComposeServiceViewController {

    private static let appGroupID = "group.app.lovable.screenshotshelf"
    private static let sharedDirName = "SharedShelfImages"
    private static let pasteboardImageType = "com.screenshotshelf.shared-image"
    private static let pasteboardNoteType = "com.screenshotshelf.shared-note"
    private static let pasteboardSourceURLType = "com.screenshotshelf.source-url"

    override func viewDidLoad() {
        super.viewDidLoad()
        self.title = "Save to Shelf"
        self.placeholder = "Optional note (AI will figure out the rest)"
        appendLog("viewDidLoad")
    }

    override func isContentValid() -> Bool {
        let valid = hasImageAttachment()
        appendLog("isContentValid → \(valid)")
        return valid
    }

    override func didSelectPost() {
        appendLog("didSelectPost called")
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            appendLog("ERROR: no inputItems or attachments")
            extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }

        appendLog("attachments: \(providers.count)")
        let userNote = self.contentText ?? ""
        let group = DispatchGroup()
        let sourceURL = extractSourceURL(from: item, providers: providers)

        for (i, provider) in providers.enumerated() {
            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                appendLog("attachment \(i): image — loading")
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { (data, error) in
                    defer { group.leave() }
                    if let error = error {
                        self.appendLog("attachment \(i): loadItem error: \(error.localizedDescription)")
                        return
                    }
                    if let bytes = self.extractImageData(from: data) {
                        self.appendLog("attachment \(i): extracted \(bytes.count) bytes")
                        let ok = self.saveSharedImage(bytes, note: userNote, sourceURL: sourceURL)
                        self.appendLog("attachment \(i): saveSharedImage → \(ok)")
                    } else {
                        self.appendLog("attachment \(i): could not extract data, type was \(type(of: data))")
                    }
                }
            } else {
                appendLog("attachment \(i): not an image, skipping")
            }
        }

        group.notify(queue: .main) {
            self.appendLog("group.notify — opening containing app")
            self.openContainingApp {
                self.appendLog("completing request")
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            }
        }
    }

    override func configurationItems() -> [Any]! {
        return []
    }

    private func hasImageAttachment() -> Bool {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else { return false }
        return providers.contains { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }
    }

    private func extractImageData(from data: NSSecureCoding?) -> Data? {
        if let url = data as? URL {
            return try? Data(contentsOf: url)
        } else if let img = data as? UIImage {
            return img.jpegData(compressionQuality: 0.85)
        } else if let d = data as? Data {
            return d
        }
        return nil
    }

    private func extractSourceURL(from item: NSExtensionItem, providers: [NSItemProvider]) -> String? {
        if let attributedContentText = item.attributedContentText?.string,
           let url = firstURL(in: attributedContentText) {
            appendLog("source URL from attributedContentText: \(url)")
            return url
        }

        if let attributedTitle = item.attributedTitle?.string,
           let url = firstURL(in: attributedTitle) {
            appendLog("source URL from attributedTitle: \(url)")
            return url
        }

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                let semaphore = DispatchSemaphore(value: 0)
                var found: String?
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
                    if let url = data as? URL {
                        found = url.absoluteString
                    } else if let text = data as? String {
                        found = self.firstURL(in: text)
                    }
                    semaphore.signal()
                }
                _ = semaphore.wait(timeout: .now() + 1.5)
                if let found {
                    appendLog("source URL from URL attachment: \(found)")
                    return found
                }
            }
        }

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                let semaphore = DispatchSemaphore(value: 0)
                var found: String?
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
                    if let text = data as? String {
                        found = self.firstURL(in: text)
                    } else if let data = data as? Data,
                              let text = String(data: data, encoding: .utf8) {
                        found = self.firstURL(in: text)
                    }
                    semaphore.signal()
                }
                _ = semaphore.wait(timeout: .now() + 1.5)
                if let found {
                    appendLog("source URL from text attachment: \(found)")
                    return found
                }
            }
        }

        appendLog("source URL not available from share input")
        return nil
    }

    private func firstURL(in text: String) -> String? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        return detector
            .matches(in: text, options: [], range: range)
            .compactMap { $0.url?.absoluteString }
            .first
    }

    private func appGroupDir() -> URL? {
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ShareViewController.appGroupID) else {
            return nil
        }
        let dir = container.appendingPathComponent(ShareViewController.sharedDirName)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private func appendLog(_ msg: String) {
        // Write to App Group container so the main app can read it
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let line = "[\(timestamp)] \(msg)\n"
        guard let dir = appGroupDir() else {
            // Try Documents directory as a fallback so we know if appGroupDir was the problem
            if let docs = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) {
                let fallback = docs.appendingPathComponent("_extension_log_NO_GROUP.txt")
                if let h = try? FileHandle(forWritingTo: fallback) {
                    h.seekToEndOfFile()
                    h.write(line.data(using: .utf8) ?? Data())
                    try? h.close()
                } else {
                    try? line.data(using: .utf8)?.write(to: fallback)
                }
            }
            return
        }
        let logPath = dir.appendingPathComponent("_extension_log.txt")
        if FileManager.default.fileExists(atPath: logPath.path),
           let h = try? FileHandle(forWritingTo: logPath) {
            h.seekToEndOfFile()
            h.write(line.data(using: .utf8) ?? Data())
            try? h.close()
        } else {
            try? line.data(using: .utf8)?.write(to: logPath)
        }
    }

    private func saveToAppGroup(_ data: Data, note: String, sourceURL: String?) -> Bool {
        guard let dir = appGroupDir() else {
            appendLog("ERROR: appGroupDir nil — App Group entitlement is not active")
            return false
        }

        let id = UUID().uuidString
        let imagePath = dir.appendingPathComponent("\(id).jpg")
        let notePath = dir.appendingPathComponent("\(id).txt")
        let metadataPath = dir.appendingPathComponent("\(id).json")

        do {
            try data.write(to: imagePath)
            appendLog("wrote image: \(imagePath.lastPathComponent) (\(data.count) bytes)")
            if !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                try? note.write(to: notePath, atomically: true, encoding: .utf8)
            }
            if let sourceURL, !sourceURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let metadata = ["sourceURL": sourceURL]
                if let metadataData = try? JSONSerialization.data(withJSONObject: metadata, options: []) {
                    try? metadataData.write(to: metadataPath)
                }
            }
            return true
        } catch {
            appendLog("ERROR writing image: \(error.localizedDescription)")
            return false
        }
    }

    private func saveSharedImage(_ data: Data, note: String, sourceURL: String?) -> Bool {
        if saveToAppGroup(data, note: note, sourceURL: sourceURL) {
            return true
        }
        return saveToPasteboard(data, note: note, sourceURL: sourceURL)
    }

    private func saveToPasteboard(_ data: Data, note: String, sourceURL: String?) -> Bool {
        var item: [String: Any] = [
            ShareViewController.pasteboardImageType: data
        ]
        if let noteData = note.data(using: .utf8), !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            item[ShareViewController.pasteboardNoteType] = noteData
        }
        if let sourceURLData = sourceURL?.data(using: .utf8) {
            item[ShareViewController.pasteboardSourceURLType] = sourceURLData
        }
        var items = UIPasteboard.general.items
        items.append(item)
        UIPasteboard.general.items = items
        appendLog("queued image to general pasteboard fallback (\(data.count) bytes, queue: \(items.count))")
        return true
    }

    private func openContainingApp(completion: @escaping () -> Void) {
        guard let url = URL(string: "screenshotshelf://shared") else {
            completion()
            return
        }
        extensionContext?.open(url) { success in
            self.appendLog("openContainingApp → \(success)")
            if !success {
                self.notifyToOpenApp()
            }
            completion()
        }
    }

    private func notifyToOpenApp() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            if let error = error {
                self.appendLog("notifyToOpenApp authorization error: \(error.localizedDescription)")
                return
            }
            guard granted else {
                self.appendLog("notifyToOpenApp skipped: notification permission not granted")
                return
            }

            let content = UNMutableNotificationContent()
            content.title = "Screenshot saved"
            content.body = "Open Screenshot Shelf to finish importing it."
            content.sound = .default

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
            let request = UNNotificationRequest(
                identifier: "open-screenshot-shelf-\(UUID().uuidString)",
                content: content,
                trigger: trigger
            )

            center.add(request) { error in
                if let error = error {
                    self.appendLog("notifyToOpenApp add error: \(error.localizedDescription)")
                } else {
                    self.appendLog("notifyToOpenApp scheduled")
                }
            }
        }
    }
}
