//
//  CalendarSyncManager.swift
//  Timetable
//
//  Calendar sync manager for fetching and parsing iCal feeds
//

import Foundation
import WebKit

class CalendarSyncManager: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private var syncTimer: Timer?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        if action == "sync", let url = body["url"] as? String {
            syncCalendar(urlString: url)
        }
    }

    func syncCalendar(urlString: String) {
        guard let url = URL(string: urlString) else {
            sendError("Invalid URL")
            return
        }

        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            if let error = error {
                self?.sendError("Network error: \(error.localizedDescription)")
                return
            }

            guard let data = data, let icsContent = String(data: data, encoding: .utf8) else {
                self?.sendError("Failed to read calendar data")
                return
            }

            let events = self?.parseICS(icsContent) ?? []
            self?.sendEvents(events)
        }
        task.resume()
    }

    private func parseICS(_ content: String) -> [[String: Any]] {
        var events: [[String: Any]] = []
        let lines = content.components(separatedBy: .newlines)

        var currentEvent: [String: String] = [:]
        var inEvent = false
        var currentKey = ""
        var currentValue = ""

        for line in lines {
            // Handle line continuation (lines starting with space or tab)
            if line.hasPrefix(" ") || line.hasPrefix("\t") {
                currentValue += line.trimmingCharacters(in: .whitespaces)
                continue
            }

            // Save previous key-value if exists
            if !currentKey.isEmpty {
                currentEvent[currentKey] = currentValue
            }

            // Parse new line
            if line == "BEGIN:VEVENT" {
                inEvent = true
                currentEvent = [:]
                currentKey = ""
                currentValue = ""
            } else if line == "END:VEVENT" {
                if inEvent {
                    if let event = convertToEvent(currentEvent) {
                        events.append(event)
                    }
                }
                inEvent = false
                currentKey = ""
                currentValue = ""
            } else if inEvent {
                let parts = line.split(separator: ":", maxSplits: 1)
                if parts.count == 2 {
                    // Handle properties with parameters (e.g., DTSTART;TZID=...)
                    let keyPart = String(parts[0])
                    currentKey = keyPart.split(separator: ";").first.map(String.init) ?? keyPart
                    currentValue = String(parts[1])
                }
            }
        }

        return events
    }

    private func convertToEvent(_ icsEvent: [String: String]) -> [String: Any]? {
        guard let summary = icsEvent["SUMMARY"] else { return nil }

        let description = decodeICSString(icsEvent["DESCRIPTION"] ?? "")
        let location = decodeICSString(icsEvent["LOCATION"] ?? "")

        // Parse and clean the description
        let cleanedInfo = parseEventDescription(description, location: location)

        var event: [String: Any] = [
            "id": icsEvent["UID"] ?? UUID().uuidString,
            "title": decodeICSString(summary),
            "note": cleanedInfo,
            "important": false,
            "done": false
        ]

        // Parse DTSTART
        if let dtstart = icsEvent["DTSTART"] {
            let (date, time) = parseDTValue(dtstart)
            event["date"] = date
            event["time"] = time
        }

        // Parse DTEND for end time
        if let dtend = icsEvent["DTEND"] {
            let (_, endTime) = parseDTValue(dtend)
            event["endTime"] = endTime
        }

        return event
    }

    private func parseEventDescription(_ description: String, location: String) -> String {
        var parts: [String] = []

        // Extract teacher name: "Teachers: - Name" or "Teacher: Name"
        if let teacherRange = description.range(of: "Teachers?:\\s*-?\\s*", options: .regularExpression) {
            let afterTeacher = description[teacherRange.upperBound...]
            if let endRange = afterTeacher.range(of: "\n") ?? afterTeacher.range(of: "Activity Type") {
                let teacher = String(afterTeacher[..<endRange.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
                if !teacher.isEmpty && teacher.count < 50 {
                    parts.append(teacher)
                }
            } else {
                let teacher = String(afterTeacher).trimmingCharacters(in: .whitespacesAndNewlines)
                if !teacher.isEmpty && teacher.count < 50 {
                    parts.append(teacher)
                }
            }
        }

        // Extract activity type: "Activity Type: Lecture" or similar
        if let typeMatch = description.range(of: "Activity Type:\\s*([^|\\n]+)", options: .regularExpression) {
            var actType = String(description[typeMatch])
            actType = actType.replacingOccurrences(of: "Activity Type: ", with: "")
            actType = actType.trimmingCharacters(in: .whitespacesAndNewlines)
            // Only include if it's a meaningful type
            let meaningfulTypes = ["Lecture", "Seminar", "Tutorial", "Lab", "Workshop", "Exam"]
            for mType in meaningfulTypes {
                if actType.lowercased().contains(mType.lowercased()) {
                    parts.append(mType)
                    break
                }
            }
        }

        // Add location if present and not too long
        let cleanLocation = location.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanLocation.isEmpty && cleanLocation.count < 40 {
            parts.append(cleanLocation)
        }

        return parts.joined(separator: " | ")
    }

    private func parseDTValue(_ value: String) -> (date: String, time: String) {
        // Handle formats: 20260122T100000Z, 20260122T100000, 20260122
        let cleanValue = value.replacingOccurrences(of: "Z", with: "")

        if cleanValue.contains("T") {
            let parts = cleanValue.split(separator: "T")
            let datePart = String(parts[0])
            let timePart = parts.count > 1 ? String(parts[1]) : "000000"

            let year = String(datePart.prefix(4))
            let month = String(datePart.dropFirst(4).prefix(2))
            let day = String(datePart.dropFirst(6).prefix(2))

            let hour = String(timePart.prefix(2))
            let minute = String(timePart.dropFirst(2).prefix(2))

            return (date: "\(year)-\(month)-\(day)", time: "\(hour):\(minute)")
        } else {
            // All-day event
            let year = String(cleanValue.prefix(4))
            let month = String(cleanValue.dropFirst(4).prefix(2))
            let day = String(cleanValue.dropFirst(6).prefix(2))

            return (date: "\(year)-\(month)-\(day)", time: "00:00")
        }
    }

    private func decodeICSString(_ value: String) -> String {
        return value
            .replacingOccurrences(of: "\\n", with: "\n")
            .replacingOccurrences(of: "\\,", with: ",")
            .replacingOccurrences(of: "\\;", with: ";")
            .replacingOccurrences(of: "\\\\", with: "\\")
    }

    private func sendEvents(_ events: [[String: Any]]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: events),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            sendError("Failed to serialize events")
            return
        }

        let escapedJson = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("window.receiveImportedEvents('\(escapedJson)')")
        }
    }

    private func sendError(_ message: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("console.error('Calendar sync error: \(message)')")
        }
    }

    func startAutoSync(interval: TimeInterval = 3600, urlString: String) {
        syncTimer?.invalidate()
        syncTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.syncCalendar(urlString: urlString)
        }
    }

    func stopAutoSync() {
        syncTimer?.invalidate()
        syncTimer = nil
    }
}
