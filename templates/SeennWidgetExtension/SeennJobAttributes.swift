// SeennJobAttributes.swift
// Widget Extension - Shared Attributes
//
// This file MUST be included in both:
// 1. Your main app target
// 2. Your Widget Extension target
//
// Add this file to both targets in Xcode's target membership

import ActivityKit
import Foundation

/// Attributes for Seenn Job Live Activity
/// Must match the definition in SeennReactNative
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
        // CTA Button fields
        public var ctaButtonText: String?
        public var ctaDeepLink: String?
        public var ctaButtonStyle: String?
        public var ctaBackgroundColor: String?
        public var ctaTextColor: String?
        public var ctaCornerRadius: Int?

        public init(
            progress: Int,
            status: String,
            message: String? = nil,
            stageName: String? = nil,
            stageIndex: Int? = nil,
            stageTotal: Int? = nil,
            estimatedEndTime: Date? = nil,
            resultUrl: String? = nil,
            errorMessage: String? = nil,
            ctaButtonText: String? = nil,
            ctaDeepLink: String? = nil,
            ctaButtonStyle: String? = nil,
            ctaBackgroundColor: String? = nil,
            ctaTextColor: String? = nil,
            ctaCornerRadius: Int? = nil
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
            self.ctaButtonText = ctaButtonText
            self.ctaDeepLink = ctaDeepLink
            self.ctaButtonStyle = ctaButtonStyle
            self.ctaBackgroundColor = ctaBackgroundColor
            self.ctaTextColor = ctaTextColor
            self.ctaCornerRadius = ctaCornerRadius
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
