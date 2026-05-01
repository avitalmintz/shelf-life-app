import Foundation
import Capacitor
import UserNotifications

@objc(ShelfRemindersPlugin)
public class ShelfRemindersPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShelfRemindersPlugin"
    public let jsName = "ShelfReminders"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private static func parseDate(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let title = call.getString("title"),
              let dateString = call.getString("date") else {
            call.reject("Missing reminder id, title, or date")
            return
        }

        guard let date = ShelfRemindersPlugin.parseDate(dateString), date > Date() else {
            call.resolve()
            return
        }

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard granted else {
                call.reject("Notification permission was not granted")
                return
            }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = call.getString("body") ?? "Open Screenshot Shelf to revisit this."
            content.sound = .default

            let components = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute],
                from: date
            )
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

            center.removePendingNotificationRequests(withIdentifiers: [id])
            center.add(request) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve()
                }
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.resolve()
            return
        }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
        call.resolve()
    }
}
