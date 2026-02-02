import Foundation

// MARK: - Live Activity Bridge Protocol
//
// The SDK does NOT define ActivityAttributes or call ActivityKit directly.
// This avoids the "ActivityInput error 0" caused by module isolation.
//
// Your app must implement SeennLiveActivityBridge and register it during app init.
// See: https://docs.seenn.io/client/react-native#live-activity-setup

@available(iOS 16.2, *)
public protocol SeennLiveActivityBridge: AnyObject {
    /// Check if Live Activities are enabled on this device
    func areActivitiesEnabled() -> Bool

    /// Start a new Live Activity
    /// - Returns: Dictionary with "success", "activityId", "jobId" or "error"
    func startActivity(
        jobId: String,
        title: String,
        jobType: String,
        initialProgress: Int,
        initialMessage: String?,
        onPushToken: @escaping (String) -> Void
    ) -> [String: Any]

    /// Update an existing Live Activity
    func updateActivity(
        jobId: String,
        progress: Int,
        status: String,
        message: String?,
        stageName: String?,
        stageIndex: Int?,
        stageTotal: Int?,
        estimatedEndTime: Date?
    ) -> Bool

    /// End a Live Activity
    func endActivity(
        jobId: String,
        finalStatus: String,
        finalProgress: Int,
        message: String?,
        resultUrl: String?,
        errorMessage: String?,
        dismissAfter: TimeInterval,
        ctaButtonText: String?,
        ctaDeepLink: String?,
        ctaButtonStyle: String?,
        ctaBackgroundColor: String?,
        ctaTextColor: String?,
        ctaCornerRadius: Int?
    ) -> Bool

    /// Check if an activity is active
    func isActivityActive(_ jobId: String) -> Bool

    /// Get all active activity IDs
    func getActiveActivityIds() -> [String]

    /// Get count of active activities
    func getActivityCount() -> Int

    /// Cancel an activity immediately
    func cancelActivity(_ jobId: String) -> Bool

    /// Cancel all activities
    func cancelAllActivities() -> Bool
}

// MARK: - Bridge Registry

@available(iOS 16.2, *)
@objc(SeennLiveActivityRegistry)
public class SeennLiveActivityRegistry: NSObject {
    @objc public static let shared = SeennLiveActivityRegistry()

    private var bridge: SeennLiveActivityBridge?
    private var pushTokenCallback: ((String, String) -> Void)?

    private override init() {
        super.init()
    }

    /// Register your app's Live Activity bridge implementation
    /// Call this in your AppDelegate
    public func register(_ bridge: SeennLiveActivityBridge) {
        self.bridge = bridge
    }

    /// Get the registered bridge
    public func getBridge() -> SeennLiveActivityBridge? {
        return bridge
    }

    /// Check if a bridge is registered
    @objc public var isRegistered: Bool {
        return bridge != nil
    }

    /// Set callback for push tokens (called by React Native bridge)
    @objc public func setPushTokenCallback(_ callback: @escaping (String, String) -> Void) {
        self.pushTokenCallback = callback
    }

    /// Forward push token to React Native (called by bridge implementation)
    public func notifyPushToken(jobId: String, token: String) {
        pushTokenCallback?(jobId, token)
    }
}

// MARK: - Errors

public enum SeennLiveActivityError: Error, LocalizedError {
    case bridgeNotRegistered
    case activitiesNotEnabled
    case activityNotFound
    case invalidState

    public var errorDescription: String? {
        switch self {
        case .bridgeNotRegistered:
            return "Live Activity bridge not registered. Call SeennLiveActivityRegistry.shared.register() in your AppDelegate. See: https://docs.seenn.io/client/react-native#live-activity-setup"
        case .activitiesNotEnabled:
            return "Live Activities are not enabled on this device"
        case .activityNotFound:
            return "Live Activity not found for the given job ID"
        case .invalidState:
            return "Invalid activity state"
        }
    }
}

