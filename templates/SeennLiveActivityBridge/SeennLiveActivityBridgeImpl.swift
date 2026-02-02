import Foundation
import ActivityKit
import SeennReactNative

// MARK: - Live Activity Bridge Implementation
//
// This file implements the SeennLiveActivityBridge protocol.
// It's compiled in your app's module, so it uses YOUR SeennJobAttributes.
// This avoids the "ActivityInput error 0" module isolation issue.
//
// Copy this file to your Xcode project and register it in AppDelegate.

@available(iOS 16.2, *)
class SeennLiveActivityBridgeImpl: SeennLiveActivityBridge {

    static let shared = SeennLiveActivityBridgeImpl()

    private var activities: [String: Activity<SeennJobAttributes>] = [:]
    private var tokenCallbacks: [String: (String) -> Void] = [:]

    private init() {}

    // MARK: - SeennLiveActivityBridge Protocol

    func areActivitiesEnabled() -> Bool {
        return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    func startActivity(
        jobId: String,
        title: String,
        jobType: String,
        initialProgress: Int,
        initialMessage: String?,
        onPushToken: @escaping (String) -> Void
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

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            return [
                "success": false,
                "error": "Live Activities are not enabled"
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

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil),
                pushType: .token
            )

            activities[jobId] = activity
            tokenCallbacks[jobId] = onPushToken

            // Listen for push token updates
            Task {
                for await tokenData in activity.pushTokenUpdates {
                    let token = tokenData.map { String(format: "%02x", $0) }.joined()
                    await MainActor.run {
                        self.tokenCallbacks[jobId]?(token)
                    }
                }
            }

            // Listen for activity state changes
            Task {
                for await activityState in activity.activityStateUpdates {
                    if activityState == .dismissed || activityState == .ended {
                        await MainActor.run {
                            self.activities.removeValue(forKey: jobId)
                            self.tokenCallbacks.removeValue(forKey: jobId)
                        }
                    }
                }
            }

            return [
                "success": true,
                "activityId": activity.id,
                "jobId": jobId
            ]
        } catch {
            return [
                "success": false,
                "error": error.localizedDescription
            ]
        }
    }

    func updateActivity(
        jobId: String,
        progress: Int,
        status: String,
        message: String?,
        stageName: String?,
        stageIndex: Int?,
        stageTotal: Int?,
        estimatedEndTime: Date?
    ) -> Bool {
        guard let activity = activities[jobId] else {
            return false
        }

        let state = SeennJobAttributes.ContentState(
            progress: progress,
            status: status,
            message: message,
            stageName: stageName,
            stageIndex: stageIndex,
            stageTotal: stageTotal,
            estimatedEndTime: estimatedEndTime
        )

        Task {
            await activity.update(
                ActivityContent(state: state, staleDate: nil)
            )
        }

        return true
    }

    func endActivity(
        jobId: String,
        finalStatus: String,
        finalProgress: Int,
        message: String?,
        resultUrl: String?,
        errorMessage: String?,
        dismissAfter: TimeInterval,
        ctaButtonText: String? = nil,
        ctaDeepLink: String? = nil,
        ctaButtonStyle: String? = nil,
        ctaBackgroundColor: String? = nil,
        ctaTextColor: String? = nil,
        ctaCornerRadius: Int? = nil
    ) -> Bool {
        guard let activity = activities[jobId] else {
            return false
        }

        let state = SeennJobAttributes.ContentState(
            progress: finalProgress,
            status: finalStatus,
            message: message,
            resultUrl: resultUrl,
            errorMessage: errorMessage,
            ctaButtonText: ctaButtonText,
            ctaDeepLink: ctaDeepLink,
            ctaButtonStyle: ctaButtonStyle,
            ctaBackgroundColor: ctaBackgroundColor,
            ctaTextColor: ctaTextColor,
            ctaCornerRadius: ctaCornerRadius
        )

        let policy: ActivityUIDismissalPolicy = dismissAfter > 0
            ? .after(Date().addingTimeInterval(dismissAfter))
            : .default

        Task {
            await activity.end(
                ActivityContent(state: state, staleDate: nil),
                dismissalPolicy: policy
            )
        }

        activities.removeValue(forKey: jobId)
        tokenCallbacks.removeValue(forKey: jobId)
        return true
    }

    func isActivityActive(_ jobId: String) -> Bool {
        guard let activity = activities[jobId] else { return false }
        return activity.activityState == .active
    }

    func getActiveActivityIds() -> [String] {
        return Array(activities.keys)
    }

    func getActivityCount() -> Int {
        return activities.count
    }

    func cancelActivity(_ jobId: String) -> Bool {
        guard let activity = activities[jobId] else {
            return false
        }

        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        activities.removeValue(forKey: jobId)
        tokenCallbacks.removeValue(forKey: jobId)
        return true
    }

    func cancelAllActivities() -> Bool {
        for (_, activity) in activities {
            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        activities.removeAll()
        tokenCallbacks.removeAll()
        return true
    }
}
