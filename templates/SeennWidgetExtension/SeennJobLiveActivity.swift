// SeennJobLiveActivity.swift
// Widget Extension - Live Activity UI
//
// Customize the UI to match your app's design

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.2, *)
@main
struct SeennWidgetBundle: WidgetBundle {
    var body: some Widget {
        SeennJobLiveActivity()
    }
}

@available(iOS 16.2, *)
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

@available(iOS 16.2, *)
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

            // CTA Button (shown on completed/failed)
            CTAButtonView(context: context)
        }
        .padding(16)
    }
}

// MARK: - CTA Button View

@available(iOS 16.2, *)
struct CTAButtonView: View {
    let context: ActivityViewContext<SeennJobAttributes>

    var body: some View {
        if shouldShowCTA,
           let text = context.state.ctaButtonText,
           let deepLink = context.state.ctaDeepLink,
           let url = URL(string: deepLink) {
            Link(destination: url) {
                Text(text)
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(ctaBackgroundColor)
                    .foregroundColor(ctaTextColor)
                    .cornerRadius(ctaCornerRadius)
            }
            .padding(.top, 4)
        }
    }

    private var shouldShowCTA: Bool {
        let status = context.state.status
        return (status == "completed" || status == "failed") &&
               context.state.ctaButtonText != nil &&
               context.state.ctaDeepLink != nil
    }

    private var ctaBackgroundColor: Color {
        if let hex = context.state.ctaBackgroundColor {
            return Color(hex: hex)
        }
        // Default based on style
        switch context.state.ctaButtonStyle {
        case "primary":
            return .white
        case "secondary":
            return .white.opacity(0.2)
        case "outline":
            return .clear
        default:
            return .white
        }
    }

    private var ctaTextColor: Color {
        if let hex = context.state.ctaTextColor {
            return Color(hex: hex)
        }
        // Default based on style
        switch context.state.ctaButtonStyle {
        case "primary":
            return .black
        case "secondary", "outline":
            return .white
        default:
            return .black
        }
    }

    private var ctaCornerRadius: CGFloat {
        CGFloat(context.state.ctaCornerRadius ?? 20)
    }
}

// MARK: - Color Extension for Hex Support

@available(iOS 16.2, *)
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
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

@available(iOS 16.2, *)
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

@available(iOS 16.2, *)
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

