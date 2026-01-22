import Foundation
import ActivityKit

// MARK: - Activity Attributes

/// Attributes for Seenn Job Live Activity
/// This struct must be shared with the Widget Extension
@available(iOS 16.1, *)
public struct SeennJobAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var progress: Int
        public var status: String
        public var message: String?
        public var stageName: String?
        public var stageIndex: Int?
        public var stageTotal: Int?
        public var estimatedEndTime: Date?
        public var resultUrl: String?
        public var errorMessage: String?

        public init(
            progress: Int,
            status: String,
            message: String? = nil,
            stageName: String? = nil,
            stageIndex: Int? = nil,
            stageTotal: Int? = nil,
            estimatedEndTime: Date? = nil,
            resultUrl: String? = nil,
            errorMessage: String? = nil
        ) {
            self.progress = progress
            self.status = status
            self.message = message
            self.stageName = stageName
            self.stageIndex = stageIndex
            self.stageTotal = stageTotal
            self.estimatedEndTime = estimatedEndTime
            self.resultUrl = resultUrl
            self.errorMessage = errorMessage
        }
    }

    public var jobId: String
    public var title: String
    public var jobType: String

    public init(jobId: String, title: String, jobType: String) {
        self.jobId = jobId
        self.title = title
        self.jobType = jobType
    }
}

// MARK: - Live Activity Manager

/// Manages Live Activities for Seenn jobs
@available(iOS 16.1, *)
@objc(SeennLiveActivityManager)
public class SeennLiveActivityManager: NSObject {

    @objc public static let shared = SeennLiveActivityManager()

    private var activities: [String: Activity<SeennJobAttributes>] = [:]
    private var pushTokenCallback: ((String, String) -> Void)?

    private override init() {
        super.init()
    }

    // MARK: - Push Token Callback

    @objc public func setPushTokenCallback(_ callback: @escaping (String, String) -> Void) {
        self.pushTokenCallback = callback
    }

    // MARK: - Support Check

    @objc public func isSupported() -> Bool {
        if #available(iOS 16.1, *) {
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }
        return false
    }

    @objc public func areActivitiesEnabled() -> Bool {
        if #available(iOS 16.1, *) {
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }
        return false
    }

    // MARK: - Start Activity

    @objc public func startActivity(
        jobId: String,
        title: String,
        jobType: String,
        initialProgress: Int,
        initialMessage: String?
    ) -> [String: Any] {

        // Check if already exists
        if activities[jobId] != nil {
            return [
                "success": false,
                "error": "Activity already exists for job \(jobId)"
            ]
        }

        // Check limit (iOS allows max 5 per app)
        if activities.count >= 5 {
            return [
                "success": false,
                "error": "Maximum number of Live Activities reached (5)"
            ]
        }

        let attributes = SeennJobAttributes(
            jobId: jobId,
            title: title,
            jobType: jobType
        )

        let state = SeennJobAttributes.ContentState(
            progress: initialProgress,
            status: "running",
            message: initialMessage
        )

        let content = ActivityContent(state: state, staleDate: nil)

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: content,
                pushType: .token
            )

            activities[jobId] = activity

            // Listen for push token updates
            Task {
                for await tokenData in activity.pushTokenUpdates {
                    let token = tokenData.map { String(format: "%02x", $0) }.joined()
                    DispatchQueue.main.async { [weak self] in
                        self?.pushTokenCallback?(jobId, token)
                    }
                }
            }

            // Listen for activity state changes
            Task {
                for await activityState in activity.activityStateUpdates {
                    if activityState == .dismissed || activityState == .ended {
                        DispatchQueue.main.async { [weak self] in
                            self?.activities.removeValue(forKey: jobId)
                        }
                    }
                }
            }

            return [
                "success": true,
                "activityId": activity.id,
                "jobId": jobId
            ]
        } catch let error as ActivityAuthorizationError {
            return [
                "success": false,
                "error": "Authorization error: \(error.localizedDescription)"
            ]
        } catch {
            return [
                "success": false,
                "error": error.localizedDescription
            ]
        }
    }

    // MARK: - Update Activity

    @objc public func updateActivity(
        jobId: String,
        progress: Int,
        status: String,
        message: String?,
        stageName: String?,
        stageIndex: NSNumber?,
        stageTotal: NSNumber?,
        estimatedEndTime: NSNumber?
    ) -> Bool {

        guard let activity = activities[jobId] else {
            return false
        }

        var eta: Date? = nil
        if let timestamp = estimatedEndTime?.doubleValue, timestamp > 0 {
            eta = Date(timeIntervalSince1970: timestamp)
        }

        let state = SeennJobAttributes.ContentState(
            progress: progress,
            status: status,
            message: message,
            stageName: stageName,
            stageIndex: stageIndex?.intValue,
            stageTotal: stageTotal?.intValue,
            estimatedEndTime: eta
        )

        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            await activity.update(content)
        }

        return true
    }

    // MARK: - End Activity

    @objc public func endActivity(
        jobId: String,
        finalStatus: String,
        finalProgress: Int,
        message: String?,
        resultUrl: String?,
        errorMessage: String?,
        dismissAfter: Double
    ) -> Bool {

        guard let activity = activities[jobId] else {
            return false
        }

        let state = SeennJobAttributes.ContentState(
            progress: finalProgress,
            status: finalStatus,
            message: message,
            resultUrl: resultUrl,
            errorMessage: errorMessage
        )

        let content = ActivityContent(state: state, staleDate: nil)
        let policy: ActivityUIDismissalPolicy = dismissAfter > 0
            ? .after(Date().addingTimeInterval(dismissAfter))
            : .default

        Task {
            await activity.end(content, dismissalPolicy: policy)
        }

        activities.removeValue(forKey: jobId)
        return true
    }

    // MARK: - Query Activities

    @objc public func getActiveActivityIds() -> [String] {
        return Array(activities.keys)
    }

    @objc public func isActivityActive(_ jobId: String) -> Bool {
        return activities[jobId] != nil
    }

    @objc public func getActivityCount() -> Int {
        return activities.count
    }

    // MARK: - Cancel Activities

    @objc public func cancelActivity(_ jobId: String) -> Bool {
        guard let activity = activities[jobId] else {
            return false
        }

        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        activities.removeValue(forKey: jobId)
        return true
    }

    @objc public func cancelAllActivities() -> Bool {
        for (_, activity) in activities {
            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        activities.removeAll()
        return true
    }
}

// MARK: - Fallback for older iOS versions

@available(iOS, introduced: 14.0, obsoleted: 16.1)
@objc(SeennLiveActivityManagerLegacy)
public class SeennLiveActivityManagerLegacy: NSObject {
    @objc public static let shared = SeennLiveActivityManagerLegacy()

    @objc public func isSupported() -> Bool { return false }
    @objc public func areActivitiesEnabled() -> Bool { return false }
    @objc public func startActivity(jobId: String, title: String, jobType: String, initialProgress: Int, initialMessage: String?) -> [String: Any] {
        return ["success": false, "error": "Live Activities require iOS 16.1+"]
    }
    @objc public func updateActivity(jobId: String, progress: Int, status: String, message: String?, stageName: String?, stageIndex: NSNumber?, stageTotal: NSNumber?, estimatedEndTime: NSNumber?) -> Bool { return false }
    @objc public func endActivity(jobId: String, finalStatus: String, finalProgress: Int, message: String?, resultUrl: String?, errorMessage: String?, dismissAfter: Double) -> Bool { return false }
    @objc public func getActiveActivityIds() -> [String] { return [] }
    @objc public func isActivityActive(_ jobId: String) -> Bool { return false }
    @objc public func cancelActivity(_ jobId: String) -> Bool { return false }
    @objc public func cancelAllActivities() -> Bool { return false }
}
