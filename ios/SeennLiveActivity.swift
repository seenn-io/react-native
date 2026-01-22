import Foundation
import React

/// React Native bridge for Seenn Live Activity
@objc(SeennLiveActivity)
class SeennLiveActivity: RCTEventEmitter {

    private var hasListeners = false

    override init() {
        super.init()
        setupPushTokenCallback()
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return ["SeennLiveActivityPushToken"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Push Token Callback

    private func setupPushTokenCallback() {
        if #available(iOS 16.1, *) {
            SeennLiveActivityManager.shared.setPushTokenCallback { [weak self] jobId, token in
                guard let self = self, self.hasListeners else { return }
                self.sendEvent(withName: "SeennLiveActivityPushToken", body: [
                    "jobId": jobId,
                    "token": token
                ])
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
            resolve(SeennLiveActivityManager.shared.isSupported())
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
            resolve(SeennLiveActivityManager.shared.areActivitiesEnabled())
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
            let result = SeennLiveActivityManager.shared.startActivity(
                jobId: jobId,
                title: title,
                jobType: jobType,
                initialProgress: initialProgress,
                initialMessage: initialMessage
            )
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
        let stageIndex = params["stageIndex"] as? NSNumber
        let stageTotal = params["stageTotal"] as? NSNumber
        let estimatedEndTime = params["estimatedEndTime"] as? NSNumber

        if #available(iOS 16.1, *) {
            let result = SeennLiveActivityManager.shared.updateActivity(
                jobId: jobId,
                progress: progress,
                status: status,
                message: message,
                stageName: stageName,
                stageIndex: stageIndex,
                stageTotal: stageTotal,
                estimatedEndTime: estimatedEndTime
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

        if #available(iOS 16.1, *) {
            let result = SeennLiveActivityManager.shared.endActivity(
                jobId: jobId,
                finalStatus: finalStatus,
                finalProgress: finalProgress,
                message: message,
                resultUrl: resultUrl,
                errorMessage: errorMessage,
                dismissAfter: dismissAfter
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
            resolve(SeennLiveActivityManager.shared.getActiveActivityIds())
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
            resolve(SeennLiveActivityManager.shared.isActivityActive(jobId))
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
            resolve(SeennLiveActivityManager.shared.cancelActivity(jobId))
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
            resolve(SeennLiveActivityManager.shared.cancelAllActivities())
        } else {
            resolve(false)
        }
    }
}
