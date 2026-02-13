//
//  CloudSyncManager.swift
//  Timetable
//
//  CloudKit sync manager for syncing localStorage data across devices.
//

import Foundation
import CloudKit
import WebKit

class CloudSyncManager: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    private let container = CKContainer(identifier: "iCloud.com.jinyidan.Timetable")
    private lazy var privateDB: CKDatabase = container.privateCloudDatabase
    private let zoneID = CKRecordZone.ID(zoneName: "TimetableZone", ownerName: CKCurrentUserDefaultName)
    private let changeTokenKey = "cloudkit.serverChangeToken"
    private let zoneCreatedKey = "cloudkit.zoneCreated"
    private let subscriptionCreatedKey = "cloudkit.subscriptionCreated"

    private var isFetchingChanges = false

    override init() {
        super.init()
        setupZoneAndSubscription()
        NotificationCenter.default.addObserver(self, selector: #selector(handleRemoteNotification), name: .cloudKitRemoteNotification, object: nil)
    }

    // MARK: - Zone & Subscription Setup

    private func setupZoneAndSubscription() {
        guard !UserDefaults.standard.bool(forKey: zoneCreatedKey) else {
            setupSubscription()
            return
        }

        let zone = CKRecordZone(zoneID: zoneID)
        let operation = CKModifyRecordZonesOperation(recordZonesToSave: [zone], recordZoneIDsToDelete: nil)
        operation.modifyRecordZonesResultBlock = { [weak self] result in
            switch result {
            case .success:
                UserDefaults.standard.set(true, forKey: self?.zoneCreatedKey ?? "")
                self?.setupSubscription()
            case .failure(let error):
                print("CloudSync: Failed to create zone: \(error)")
            }
        }
        privateDB.add(operation)
    }

    private func setupSubscription() {
        guard !UserDefaults.standard.bool(forKey: subscriptionCreatedKey) else { return }

        let subscription = CKDatabaseSubscription(subscriptionID: "timetable-changes")
        let notificationInfo = CKSubscription.NotificationInfo()
        notificationInfo.shouldSendContentAvailable = true
        subscription.notificationInfo = notificationInfo

        privateDB.save(subscription) { [weak self] _, error in
            if let error = error {
                // Already exists is OK
                if (error as? CKError)?.code == .serverRejectedRequest { return }
                print("CloudSync: Failed to create subscription: \(error)")
            } else {
                UserDefaults.standard.set(true, forKey: self?.subscriptionCreatedKey ?? "")
            }
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "pushEvents":
            if let data = body["events"] as? [[String: Any]] {
                pushEvents(data)
            }
        case "pushGoals":
            if let data = body["goals"] as? [[String: Any]] {
                pushGoals(data)
            }
        case "pushRecurrenceDone":
            if let data = body["map"] as? [String: Bool] {
                pushRecurrenceDone(data)
            }
        case "pushSettings":
            if let key = body["key"] as? String, let value = body["value"] as? String {
                pushSetting(key: key, value: value)
            }
        case "deleteEvent":
            if let id = body["id"] as? String {
                softDeleteRecord(type: "TimetableEvent", id: id)
            }
        case "deleteGoal":
            if let id = body["id"] as? String {
                softDeleteRecord(type: "MonthlyGoal", id: id)
            }
        case "requestSync":
            fetchChanges()
        default:
            break
        }
    }

    // MARK: - Push to CloudKit

    private func pushEvents(_ events: [[String: Any]]) {
        var records: [CKRecord] = []
        for event in events {
            guard let id = event["id"] as? String else { continue }
            let recordID = CKRecord.ID(recordName: "event-\(id)", zoneID: zoneID)
            let record = CKRecord(recordType: "TimetableEvent", recordID: recordID)
            record["eventID"] = id as CKRecordValue
            record["date"] = (event["date"] as? String ?? "") as CKRecordValue
            record["time"] = (event["time"] as? String ?? "") as CKRecordValue
            record["endTime"] = (event["endTime"] as? String ?? "") as CKRecordValue
            record["title"] = (event["title"] as? String ?? "") as CKRecordValue
            record["note"] = (event["note"] as? String ?? "") as CKRecordValue
            record["important"] = ((event["important"] as? Bool ?? false) ? 1 : 0) as CKRecordValue
            record["done"] = ((event["done"] as? Bool ?? false) ? 1 : 0) as CKRecordValue
            record["createdAt"] = (event["createdAt"] as? Double ?? Double(Date().timeIntervalSince1970 * 1000)) as CKRecordValue
            record["modifiedAt"] = (event["modifiedAt"] as? Double ?? Double(Date().timeIntervalSince1970 * 1000)) as CKRecordValue
            record["deleted"] = 0 as CKRecordValue

            if let recurrence = event["recurrence"] as? [String: Any],
               let jsonData = try? JSONSerialization.data(withJSONObject: recurrence),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                record["recurrenceJSON"] = jsonString as CKRecordValue
            } else {
                record["recurrenceJSON"] = "" as CKRecordValue
            }

            records.append(record)
        }
        saveRecords(records)
    }

    private func pushGoals(_ goals: [[String: Any]]) {
        var records: [CKRecord] = []
        for goal in goals {
            guard let id = goal["id"] as? String else { continue }
            let recordID = CKRecord.ID(recordName: "goal-\(id)", zoneID: zoneID)
            let record = CKRecord(recordType: "MonthlyGoal", recordID: recordID)
            record["goalID"] = id as CKRecordValue
            record["month"] = (goal["month"] as? Int ?? 0) as CKRecordValue
            record["title"] = (goal["title"] as? String ?? "") as CKRecordValue
            record["createdAt"] = (goal["createdAt"] as? Double ?? Double(Date().timeIntervalSince1970 * 1000)) as CKRecordValue
            record["deleted"] = 0 as CKRecordValue
            records.append(record)
        }
        saveRecords(records)
    }

    private func pushRecurrenceDone(_ map: [String: Bool]) {
        var records: [CKRecord] = []
        for (key, isDone) in map {
            let safeKey = key.replacingOccurrences(of: ":", with: "_")
            let recordID = CKRecord.ID(recordName: "recdone-\(safeKey)", zoneID: zoneID)
            let record = CKRecord(recordType: "RecurrenceDone", recordID: recordID)
            record["compositeKey"] = key as CKRecordValue
            record["isDone"] = (isDone ? 1 : 0) as CKRecordValue
            records.append(record)
        }
        saveRecords(records)
    }

    private func pushSetting(key: String, value: String) {
        let recordID = CKRecord.ID(recordName: "setting-\(key)", zoneID: zoneID)
        let record = CKRecord(recordType: "UserSettings", recordID: recordID)
        record["settingKey"] = key as CKRecordValue
        record["settingValue"] = value as CKRecordValue
        saveRecords([record])
    }

    private func softDeleteRecord(type: String, id: String) {
        let prefix = type == "TimetableEvent" ? "event" : "goal"
        let recordID = CKRecord.ID(recordName: "\(prefix)-\(id)", zoneID: zoneID)

        privateDB.fetch(withRecordID: recordID) { [weak self] record, error in
            if let record = record {
                record["deleted"] = 1 as CKRecordValue
                record["modifiedAt"] = (Date().timeIntervalSince1970 * 1000) as CKRecordValue
                self?.saveRecords([record])
            } else if error != nil {
                // Record doesn't exist remotely yet — create it as deleted
                let record = CKRecord(recordType: type, recordID: recordID)
                if type == "TimetableEvent" {
                    record["eventID"] = id as CKRecordValue
                } else {
                    record["goalID"] = id as CKRecordValue
                }
                record["deleted"] = 1 as CKRecordValue
                record["modifiedAt"] = (Date().timeIntervalSince1970 * 1000) as CKRecordValue
                record["title"] = "" as CKRecordValue
                self?.saveRecords([record])
            }
        }
    }

    // MARK: - Save Helper

    private func saveRecords(_ records: [CKRecord]) {
        guard !records.isEmpty else { return }

        let operation = CKModifyRecordsOperation(recordsToSave: records, recordIDsToDelete: nil)
        operation.savePolicy = .changedKeys
        operation.isAtomic = false

        operation.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                break
            case .failure(let error):
                print("CloudSync: Save failed: \(error)")
            }
        }
        privateDB.add(operation)
    }

    // MARK: - Fetch Changes

    @objc private func handleRemoteNotification() {
        fetchChanges()
    }

    func fetchChanges() {
        guard !isFetchingChanges else { return }
        isFetchingChanges = true

        let token = loadChangeToken()
        let options = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
        options.previousServerChangeToken = token

        let operation = CKFetchRecordZoneChangesOperation(recordZoneIDs: [zoneID], configurationsByRecordZoneID: [zoneID: options])

        var changedEvents: [[String: Any]] = []
        var changedGoals: [[String: Any]] = []
        var changedRecurrenceDone: [String: Bool] = [:]
        var changedSettings: [String: String] = [:]

        operation.recordWasChangedBlock = { _, result in
            switch result {
            case .success(let record):
                switch record.recordType {
                case "TimetableEvent":
                    var event: [String: Any] = [
                        "id": record["eventID"] as? String ?? "",
                        "date": record["date"] as? String ?? "",
                        "time": record["time"] as? String ?? "",
                        "endTime": record["endTime"] as? String ?? "",
                        "title": record["title"] as? String ?? "",
                        "note": record["note"] as? String ?? "",
                        "important": (record["important"] as? Int ?? 0) == 1,
                        "done": (record["done"] as? Int ?? 0) == 1,
                        "createdAt": record["createdAt"] as? Double ?? 0,
                        "modifiedAt": record["modifiedAt"] as? Double ?? 0,
                        "deleted": (record["deleted"] as? Int ?? 0) == 1
                    ]
                    if let recJSON = record["recurrenceJSON"] as? String, !recJSON.isEmpty,
                       let data = recJSON.data(using: .utf8),
                       let rec = try? JSONSerialization.jsonObject(with: data) {
                        event["recurrence"] = rec
                    }
                    changedEvents.append(event)

                case "MonthlyGoal":
                    let goal: [String: Any] = [
                        "id": record["goalID"] as? String ?? "",
                        "month": record["month"] as? Int ?? 0,
                        "title": record["title"] as? String ?? "",
                        "createdAt": record["createdAt"] as? Double ?? 0,
                        "deleted": (record["deleted"] as? Int ?? 0) == 1
                    ]
                    changedGoals.append(goal)

                case "RecurrenceDone":
                    if let key = record["compositeKey"] as? String {
                        changedRecurrenceDone[key] = (record["isDone"] as? Int ?? 0) == 1
                    }

                case "UserSettings":
                    if let key = record["settingKey"] as? String,
                       let value = record["settingValue"] as? String {
                        changedSettings[key] = value
                    }

                default:
                    break
                }
            case .failure(let error):
                print("CloudSync: Record change error: \(error)")
            }
        }

        operation.recordZoneFetchResultBlock = { [weak self] (zoneID: CKRecordZone.ID, result: Result<(serverChangeToken: CKServerChangeToken, clientChangeTokenData: Data?, moreComing: Bool), Error>) in
            switch result {
            case .success(let values):
                self?.saveChangeToken(values.serverChangeToken)
            case .failure(let error):
                let ckError = error as? CKError
                if ckError?.code == .changeTokenExpired {
                    self?.saveChangeToken(nil)
                    self?.isFetchingChanges = false
                    self?.fetchChanges()
                    return
                }
                print("CloudSync: Zone fetch error: \(error)")
            }
            self?.isFetchingChanges = false
        }

        operation.fetchRecordZoneChangesResultBlock = { [weak self] result in
            switch result {
            case .success:
                // Send all changes to JS
                if !changedEvents.isEmpty || !changedGoals.isEmpty ||
                   !changedRecurrenceDone.isEmpty || !changedSettings.isEmpty {
                    let payload: [String: Any] = [
                        "events": changedEvents,
                        "goals": changedGoals,
                        "recurrenceDone": changedRecurrenceDone,
                        "settings": changedSettings
                    ]
                    self?.sendChangesToJS(payload)
                }
            case .failure(let error):
                print("CloudSync: Fetch changes failed: \(error)")
                self?.isFetchingChanges = false
            }
        }

        privateDB.add(operation)
    }

    // MARK: - Send to JS

    private func sendChangesToJS(_ payload: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        let escaped = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("window.receiveCloudChanges('\(escaped)')")
        }
    }

    // MARK: - Change Token Persistence

    private func loadChangeToken() -> CKServerChangeToken? {
        guard let data = UserDefaults.standard.data(forKey: changeTokenKey) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
    }

    private func saveChangeToken(_ token: CKServerChangeToken?) {
        if let token = token,
           let data = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true) {
            UserDefaults.standard.set(data, forKey: changeTokenKey)
        } else {
            UserDefaults.standard.removeObject(forKey: changeTokenKey)
        }
    }
}

// MARK: - Notification Name

extension Notification.Name {
    static let cloudKitRemoteNotification = Notification.Name("cloudKitRemoteNotification")
}
