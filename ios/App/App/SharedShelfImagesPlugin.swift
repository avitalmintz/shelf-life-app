import Foundation
import Capacitor
import UIKit

@objc(SharedShelfImagesPlugin)
public class SharedShelfImagesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharedShelfImagesPlugin"
    public let jsName = "SharedShelfImages"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPending", returnType: CAPPluginReturnPromise),
    ]

    private static let appGroupID = "group.app.lovable.screenshotshelf"
    private static let sharedDirName = "SharedShelfImages"
    private static let pasteboardImageType = "com.screenshotshelf.shared-image"
    private static let pasteboardNoteType = "com.screenshotshelf.shared-note"
    private static let pasteboardSourceURLType = "com.screenshotshelf.source-url"

    @objc func getPending(_ call: CAPPluginCall) {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedShelfImagesPlugin.appGroupID
        ) else {
            let pasteboardImages = SharedShelfImagesPlugin.getPasteboardImages()
            call.resolve([
                "images": pasteboardImages,
                "diagnostic": "App Group container unavailable. Using pasteboard fallback. Images: \(pasteboardImages.count).",
            ])
            return
        }

        let dir = container.appendingPathComponent(SharedShelfImagesPlugin.sharedDirName)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        let files: [URL]
        do {
            files = try FileManager.default.contentsOfDirectory(
                at: dir,
                includingPropertiesForKeys: [.creationDateKey],
                options: [.skipsHiddenFiles]
            )
        } catch {
            call.resolve([
                "images": [],
                "diagnostic": "Container exists but couldn't list directory: \(error.localizedDescription)",
                "containerPath": container.path,
            ])
            return
        }

        let imageFiles = files
            .filter { ["jpg", "jpeg", "png", "gif", "webp"].contains($0.pathExtension.lowercased()) }
            .sorted { (a, b) in
                let dateA = (try? a.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
                let dateB = (try? b.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
                return dateA < dateB
            }

        var images: [[String: String]] = []
        for url in imageFiles {
            guard let rawData = try? Data(contentsOf: url) else { continue }
            let (data, didCompress) = SharedShelfImagesPlugin.fitForStorage(rawData)
            let mime = didCompress ? "image/jpeg" : SharedShelfImagesPlugin.detectMimeType(from: data)
            let dataUrl = "data:\(mime);base64,\(data.base64EncodedString())"
            let id = url.deletingPathExtension().lastPathComponent

            var entry: [String: String] = ["id": id, "dataUrl": dataUrl]

            let notePath = url.deletingPathExtension().appendingPathExtension("txt")
            if let note = try? String(contentsOf: notePath, encoding: .utf8) {
                entry["note"] = note
            }

            let metadataPath = url.deletingPathExtension().appendingPathExtension("json")
            if let metadataData = try? Data(contentsOf: metadataPath),
               let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: String],
               let sourceURL = metadata["sourceURL"] {
                entry["sourceURL"] = sourceURL
            }

            images.append(entry)
        }

        let logPath = dir.appendingPathComponent("_extension_log.txt")
        let extensionLog = (try? String(contentsOf: logPath, encoding: .utf8)) ?? "(no log — extension never ran or couldn't write)"

        call.resolve([
            "images": images,
            "diagnostic": "OK. Container: \(container.path). Files: \(files.count). Images: \(imageFiles.count).",
            "extensionLog": extensionLog,
        ])
    }

    /// The web layer currently stores images in localStorage, so shared images
    /// must be much smaller than full-resolution screenshots.
    private static func fitForStorage(_ data: Data) -> (Data, Bool) {
        let maxRawBytes = 1_200_000
        if data.count <= maxRawBytes {
            return (data, false)
        }
        guard let image = UIImage(data: data) else {
            return (data, false)
        }

        for quality in stride(from: 0.92, through: 0.58, by: -0.08) {
            if let compressed = image.jpegData(compressionQuality: CGFloat(quality)),
               compressed.count <= maxRawBytes {
                return (compressed, true)
            }
        }

        var maxDim: CGFloat = 2200
        while maxDim >= 900 {
            let scale = min(1.0, maxDim / max(image.size.width, image.size.height))
            let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            let renderer = UIGraphicsImageRenderer(size: newSize)
            let scaled = renderer.image { _ in
                image.draw(in: CGRect(origin: .zero, size: newSize))
            }
            if let compressed = scaled.jpegData(compressionQuality: 0.82),
               compressed.count <= maxRawBytes {
                return (compressed, true)
            }
            maxDim -= 260
        }

        let fallbackScale = min(1.0, 900 / max(image.size.width, image.size.height))
        let fallbackSize = CGSize(width: image.size.width * fallbackScale, height: image.size.height * fallbackScale)
        let renderer = UIGraphicsImageRenderer(size: fallbackSize)
        let fallback = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: fallbackSize))
        }
        return (fallback.jpegData(compressionQuality: 0.58) ?? data, true)
    }

    private static func detectMimeType(from data: Data) -> String {
        // PNG: 89 50 4E 47
        if data.count >= 4,
           data[0] == 0x89, data[1] == 0x50, data[2] == 0x4E, data[3] == 0x47 {
            return "image/png"
        }
        // JPEG: FF D8 FF
        if data.count >= 3,
           data[0] == 0xFF, data[1] == 0xD8, data[2] == 0xFF {
            return "image/jpeg"
        }
        // GIF: 47 49 46
        if data.count >= 3,
           data[0] == 0x47, data[1] == 0x49, data[2] == 0x46 {
            return "image/gif"
        }
        // WebP: RIFF....WEBP
        if data.count >= 12,
           data[0] == 0x52, data[1] == 0x49, data[2] == 0x46, data[3] == 0x46,
           data[8] == 0x57, data[9] == 0x45, data[10] == 0x42, data[11] == 0x50 {
            return "image/webp"
        }
        return "image/jpeg"
    }

    @objc func clearPending(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        if ids.contains(where: { $0.hasPrefix("pasteboard-") }) {
            SharedShelfImagesPlugin.clearPasteboardImages()
        }
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedShelfImagesPlugin.appGroupID
        ) else {
            call.resolve()
            return
        }
        let dir = container.appendingPathComponent(SharedShelfImagesPlugin.sharedDirName)

        for id in ids {
            for ext in ["jpg", "jpeg", "png", "gif", "webp", "txt", "json"] {
                let path = dir.appendingPathComponent("\(id).\(ext)")
                try? FileManager.default.removeItem(at: path)
            }
        }
        call.resolve()
    }

    private static func getPasteboardImages() -> [[String: String]] {
        var images: [[String: String]] = []
        for (index, item) in UIPasteboard.general.items.enumerated() {
            guard let rawData = item[pasteboardImageType] as? Data else { continue }
            let (data, didCompress) = fitForStorage(rawData)
            let mime = didCompress ? "image/jpeg" : detectMimeType(from: data)
            let dataUrl = "data:\(mime);base64,\(data.base64EncodedString())"
            var entry: [String: String] = [
                "id": "pasteboard-\(index)",
                "dataUrl": dataUrl,
            ]
            if let noteData = item[pasteboardNoteType] as? Data,
               let note = String(data: noteData, encoding: .utf8) {
                entry["note"] = note
            }
            if let sourceURLData = item[pasteboardSourceURLType] as? Data,
               let sourceURL = String(data: sourceURLData, encoding: .utf8) {
                entry["sourceURL"] = sourceURL
            }
            images.append(entry)
        }
        return images
    }

    private static func clearPasteboardImages() {
        UIPasteboard.general.items = UIPasteboard.general.items.filter { $0[pasteboardImageType] == nil }
    }
}
