// SeennJobLiveActivity.swift
// Widget Extension - Live Activity UI
//
// Customize the UI to match your app's design

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
@main
struct SeennWidgetBundle: WidgetBundle {
    var body: some Widget {
        SeennJobLiveActivity()
    }
}

@available(iOS 16.1, *)
struct SeennJobLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SeennJobAttributes.self) { context in
            // Lock Screen / Banner View
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.8))
                .activitySystemActionForegroundColor(Color.white)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 4) {
                        Image(systemName: iconForJobType(context.attributes.jobType))
                            .font(.system(size: 14))
                            .foregroundColor(colorForStatus(context.state.status))
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.progress)%")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(colorForStatus(context.state.status))
                }

                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title)
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        // Progress bar
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.2))
                                    .frame(height: 6)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(colorForStatus(context.state.status))
                                    .frame(width: geometry.size.width * CGFloat(context.state.progress) / 100, height: 6)
                            }
                        }
                        .frame(height: 6)

                        // Stage info or message
                        HStack {
                            if let stageName = context.state.stageName,
                               let current = context.state.stageIndex,
                               let total = context.state.stageTotal {
                                Text("Stage \(current)/\(total): \(stageName)")
                                    .font(.system(size: 12))
                                    .foregroundColor(.secondary)
                            } else if let message = context.state.message {
                                Text(message)
                                    .font(.system(size: 12))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                    }
                    .padding(.horizontal, 4)
                }

            } compactLeading: {
                // Compact Leading (left side)
                Image(systemName: iconForJobType(context.attributes.jobType))
                    .font(.system(size: 12))
                    .foregroundColor(colorForStatus(context.state.status))

            } compactTrailing: {
                // Compact Trailing (right side)
                Text("\(context.state.progress)%")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(colorForStatus(context.state.status))

            } minimal: {
                // Minimal (small pill)
                ZStack {
                    Circle()
                        .strokeBorder(colorForStatus(context.state.status).opacity(0.3), lineWidth: 2)
                    Circle()
                        .trim(from: 0, to: CGFloat(context.state.progress) / 100)
                        .stroke(colorForStatus(context.state.status), lineWidth: 2)
                        .rotationEffect(.degrees(-90))
                }
                .frame(width: 14, height: 14)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.1, *)
struct LockScreenView: View {
    let context: ActivityViewContext<SeennJobAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: iconForStatus(context.state.status))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(colorForStatus(context.state.status))

                Text(context.attributes.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Spacer()

                Text("\(context.state.progress)%")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(colorForStatus(context.state.status))
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(colorForStatus(context.state.status))
                        .frame(width: geometry.size.width * CGFloat(context.state.progress) / 100, height: 8)
                }
            }
            .frame(height: 8)

            // Status message or stage
            HStack {
                if context.state.status == "completed" {
                    Text(context.state.message ?? "Completed!")
                        .font(.system(size: 13))
                        .foregroundColor(.green)
                } else if context.state.status == "failed" {
                    Text(context.state.errorMessage ?? "Failed")
                        .font(.system(size: 13))
                        .foregroundColor(.red)
                } else if let stageName = context.state.stageName,
                          let current = context.state.stageIndex,
                          let total = context.state.stageTotal {
                    Text("Stage \(current)/\(total): \(stageName)")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                } else if let message = context.state.message {
                    Text(message)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                // ETA
                if let eta = context.state.estimatedEndTime, context.state.status == "running" {
                    Text(eta, style: .relative)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                }
            }
        }
        .padding(16)
    }
}

// MARK: - Helper Functions

@available(iOS 16.1, *)
func iconForStatus(_ status: String) -> String {
    switch status {
    case "completed":
        return "checkmark.circle.fill"
    case "failed":
        return "xmark.circle.fill"
    case "running":
        return "arrow.triangle.2.circlepath"
    case "pending":
        return "clock"
    default:
        return "circle"
    }
}

@available(iOS 16.1, *)
func iconForJobType(_ jobType: String) -> String {
    // Customize based on your job types
    switch jobType.lowercased() {
    case "video", "video-generation":
        return "video.fill"
    case "image", "image-generation":
        return "photo.fill"
    case "audio", "audio-generation":
        return "waveform"
    case "processing":
        return "gearshape.fill"
    case "upload":
        return "arrow.up.circle.fill"
    case "download":
        return "arrow.down.circle.fill"
    default:
        return "arrow.triangle.2.circlepath"
    }
}

@available(iOS 16.1, *)
func colorForStatus(_ status: String) -> Color {
    switch status {
    case "completed":
        return .green
    case "failed":
        return .red
    case "running":
        return .blue
    case "pending":
        return .orange
    default:
        return .gray
    }
}

// MARK: - Preview

@available(iOS 16.2, *)
#Preview("Lock Screen", as: .content, using: SeennJobAttributes(
    jobId: "job_123",
    title: "Generating Video...",
    jobType: "video-generation"
)) {
    SeennJobLiveActivity()
} contentStates: {
    SeennJobAttributes.ContentState(
        progress: 45,
        status: "running",
        message: "Encoding frames...",
        stageName: "Encoding",
        stageIndex: 2,
        stageTotal: 3
    )
    SeennJobAttributes.ContentState(
        progress: 100,
        status: "completed",
        message: "Video ready!"
    )
    SeennJobAttributes.ContentState(
        progress: 30,
        status: "failed",
        errorMessage: "Processing failed"
    )
}
