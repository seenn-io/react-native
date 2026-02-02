import Foundation
import React
import UserNotifications

/// React Native bridge for Seenn Live Activity
@objc(SeennLiveActivity)
class SeennLiveActivity: RCTEventEmitter {

    private var hasListeners = false
    private var pendingTokens: [(jobId: String, token: String)] = []
    private var pendingDeviceTokens: [String] = []

    override init() {
        super.init()
        setupPushTokenCallback()
        setupDevicePushTokenCallback()
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return ["SeennLiveActivityPushToken", "SeennDevicePushToken"]
    }

    override func startObserving() {
        hasListeners = true
        // Flush any Live Activity tokens that arrived before JS was ready
        for pending in pendingTokens {
            self.sendEvent(withName: "SeennLiveActivityPushToken", body: [
                "jobId": pending.jobId,
                "token": pending.token
            ])
        }
        pendingTokens.removeAll()

        // Flush any device tokens that arrived before JS was ready
        for token in pendingDeviceTokens {
            self.sendEvent(withName: "SeennDevicePushToken", body: [
                "token": token
            ])
        }
        pendingDeviceTokens.removeAll()
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Push Token Callback

    private func setupPushTokenCallback() {
        if #available(iOS 16.1, *) {
            SeennLiveActivityRegistry.shared.setPushTokenCallback { [weak self] jobId, token in
                guard let self = self else { return }
                if self.hasListeners {
                    self.sendEvent(withName: "SeennLiveActivityPushToken", body: [
                        "jobId": jobId,
                        "token": token
                    ])
                } else {
                    // Buffer token until JS listener is ready
                    self.pendingTokens.append((jobId: jobId, token: token))
                }
            }
        }
    }

    // MARK: - Device Push Token Callback

    private func setupDevicePushTokenCallback() {
        SeennPushTokenHandler.shared.setDeviceTokenCallback { [weak self] token in
            guard let self = self else { return }
            if self.hasListeners {
                self.sendEvent(withName: "SeennDevicePushToken", body: [
                    "token": token
                ])
            } else {
                // Buffer token until JS listener is ready
                self.pendingDeviceTokens.append(token)
            }
        }
    }

    // MARK: - Support Check

    @objc(isSupported:reject:)
    func isSupported(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }
            resolve(bridge.areActivitiesEnabled())
        } else {
            resolve(false)
        }
    }

    @objc(areActivitiesEnabled:reject:)
    func areActivitiesEnabled(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }
            resolve(bridge.areActivitiesEnabled())
        } else {
            resolve(false)
        }
    }

    @objc(isBridgeRegistered:reject:)
    func isBridgeRegistered(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            resolve(SeennLiveActivityRegistry.shared.isRegistered)
        } else {
            resolve(false)
        }
    }

    // MARK: - Start Activity

    @objc(startActivity:resolve:reject:)
    func startActivity(
        params: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let jobId = params["jobId"] as? String,
              let title = params["title"] as? String else {
            reject("INVALID_PARAMS", "jobId and title are required", nil)
            return
        }

        let jobType = params["jobType"] as? String ?? "job"
        let initialProgress = params["initialProgress"] as? Int ?? 0
        let initialMessage = params["initialMessage"] as? String

        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve([
                    "success": false,
                    "error": SeennLiveActivityError.bridgeNotRegistered.localizedDescription
                ])
                return
            }

            let result = bridge.startActivity(
                jobId: jobId,
                title: title,
                jobType: jobType,
                initialProgress: initialProgress,
                initialMessage: initialMessage
            ) { [weak self] token in
                // Forward push token to React Native
                SeennLiveActivityRegistry.shared.notifyPushToken(jobId: jobId, token: token)
            }
            resolve(result)
        } else {
            resolve([
                "success": false,
                "error": "Live Activities require iOS 16.1+"
            ])
        }
    }

    // MARK: - Update Activity

    @objc(updateActivity:resolve:reject:)
    func updateActivity(
        params: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let jobId = params["jobId"] as? String,
              let progress = params["progress"] as? Int,
              let status = params["status"] as? String else {
            reject("INVALID_PARAMS", "jobId, progress, and status are required", nil)
            return
        }

        let message = params["message"] as? String
        let stageName = params["stageName"] as? String
        let stageIndex = params["stageIndex"] as? Int
        let stageTotal = params["stageTotal"] as? Int

        var eta: Date? = nil
        if let timestamp = params["estimatedEndTime"] as? Double, timestamp > 0 {
            eta = Date(timeIntervalSince1970: timestamp)
        }

        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }

            let result = bridge.updateActivity(
                jobId: jobId,
                progress: progress,
                status: status,
                message: message,
                stageName: stageName,
                stageIndex: stageIndex,
                stageTotal: stageTotal,
                estimatedEndTime: eta
            )
            resolve(result)
        } else {
            resolve(false)
        }
    }

    // MARK: - End Activity

    @objc(endActivity:resolve:reject:)
    func endActivity(
        params: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let jobId = params["jobId"] as? String,
              let finalStatus = params["finalStatus"] as? String else {
            reject("INVALID_PARAMS", "jobId and finalStatus are required", nil)
            return
        }

        let finalProgress = params["finalProgress"] as? Int ?? 100
        let message = params["message"] as? String
        let resultUrl = params["resultUrl"] as? String
        let errorMessage = params["errorMessage"] as? String
        let dismissAfter = params["dismissAfter"] as? Double ?? 300.0

        // CTA Button params
        var ctaButtonText: String? = nil
        var ctaDeepLink: String? = nil
        var ctaButtonStyle: String? = nil
        var ctaBackgroundColor: String? = nil
        var ctaTextColor: String? = nil
        var ctaCornerRadius: Int? = nil

        if let ctaButton = params["ctaButton"] as? NSDictionary {
            ctaButtonText = ctaButton["text"] as? String
            ctaDeepLink = ctaButton["deepLink"] as? String
            ctaButtonStyle = ctaButton["style"] as? String
            ctaBackgroundColor = ctaButton["backgroundColor"] as? String
            ctaTextColor = ctaButton["textColor"] as? String
            ctaCornerRadius = ctaButton["cornerRadius"] as? Int
        }

        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }

            let result = bridge.endActivity(
                jobId: jobId,
                finalStatus: finalStatus,
                finalProgress: finalProgress,
                message: message,
                resultUrl: resultUrl,
                errorMessage: errorMessage,
                dismissAfter: dismissAfter,
                ctaButtonText: ctaButtonText,
                ctaDeepLink: ctaDeepLink,
                ctaButtonStyle: ctaButtonStyle,
                ctaBackgroundColor: ctaBackgroundColor,
                ctaTextColor: ctaTextColor,
                ctaCornerRadius: ctaCornerRadius
            )
            resolve(result)
        } else {
            resolve(false)
        }
    }

    // MARK: - Query Activities

    @objc(getActiveActivityIds:reject:)
    func getActiveActivityIds(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve([])
                return
            }
            resolve(bridge.getActiveActivityIds())
        } else {
            resolve([])
        }
    }

    @objc(isActivityActive:resolve:reject:)
    func isActivityActive(
        jobId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }
            resolve(bridge.isActivityActive(jobId))
        } else {
            resolve(false)
        }
    }

    // MARK: - Cancel Activities

    @objc(cancelActivity:resolve:reject:)
    func cancelActivity(
        jobId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }
            resolve(bridge.cancelActivity(jobId))
        } else {
            resolve(false)
        }
    }

    @objc(cancelAllActivities:reject:)
    func cancelAllActivities(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            guard let bridge = SeennLiveActivityRegistry.shared.getBridge() else {
                resolve(false)
                return
            }
            resolve(bridge.cancelAllActivities())
        } else {
            resolve(false)
        }
    }

    // MARK: - Push Authorization (iOS 12+)

    @objc(getPushAuthorizationStatus:reject:)
    func getPushAuthorizationStatus(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status: String
            let isProvisional: Bool
            let canRequestFullAuthorization: Bool

            switch settings.authorizationStatus {
            case .notDetermined:
                status = "notDetermined"
                isProvisional = false
                canRequestFullAuthorization = false
            case .denied:
                status = "denied"
                isProvisional = false
                canRequestFullAuthorization = false
            case .authorized:
                status = "authorized"
                isProvisional = false
                canRequestFullAuthorization = false
            case .provisional:
                status = "provisional"
                isProvisional = true
                canRequestFullAuthorization = true
            case .ephemeral:
                status = "ephemeral"
                isProvisional = false
                canRequestFullAuthorization = false
            @unknown default:
                status = "notDetermined"
                isProvisional = false
                canRequestFullAuthorization = false
            }

            resolve([
                "status": status,
                "isProvisional": isProvisional,
                "canRequestFullAuthorization": canRequestFullAuthorization
            ])
        }
    }

    @objc(requestProvisionalPushAuthorization:reject:)
    func requestProvisionalPushAuthorization(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 12.0, *) {
            UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge, .provisional]
            ) { granted, error in
                if let error = error {
                    reject("PUSH_AUTH_ERROR", error.localizedDescription, error)
                } else {
                    if granted {
                        // Swizzle AppDelegate to capture device token
                        SeennPushTokenHandler.shared.swizzleAppDelegate()
                        // Register for remote notifications to get device token
                        DispatchQueue.main.async {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
                    resolve(granted)
                }
            }
        } else {
            // iOS < 12: Provisional not supported, fall back to standard
            UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge]
            ) { granted, error in
                if let error = error {
                    reject("PUSH_AUTH_ERROR", error.localizedDescription, error)
                } else {
                    if granted {
                        // Swizzle AppDelegate to capture device token
                        SeennPushTokenHandler.shared.swizzleAppDelegate()
                        // Register for remote notifications to get device token
                        DispatchQueue.main.async {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
                    resolve(granted)
                }
            }
        }
    }

    @objc(requestStandardPushAuthorization:reject:)
    func requestStandardPushAuthorization(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if let error = error {
                reject("PUSH_AUTH_ERROR", error.localizedDescription, error)
            } else {
                if granted {
                    // Swizzle AppDelegate to capture device token
                    SeennPushTokenHandler.shared.swizzleAppDelegate()
                    // Register for remote notifications to get device token
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                    }
                }
                resolve(granted)
            }
        }
    }
}
