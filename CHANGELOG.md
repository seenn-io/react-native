# Changelog

All notable changes to this project will be documented in this file.

## [0.9.8] - 2026-02-04

### Fixed
- Removed `#Preview` macro from SeennJobLiveActivity.swift template (requires iOS 17+, not compatible with iOS 16.2 minimum)

## [0.9.7] - 2026-02-04

### Changed
- **Minimum iOS version updated to 16.2** for Live Activity push token support
- The `pushType: .token` parameter and `ActivityContent` API were added in iOS 16.2
- All `@available` annotations in Swift templates updated from 16.1 to 16.2

### Why iOS 16.2?
While Live Activities were introduced in iOS 16.1, the APIs required for remote push updates (which is Seenn's core feature) were added in iOS 16.2:
- `Activity.request(pushType: .token)` - iOS 16.2+
- `ActivityContent` struct - iOS 16.2+
- `activity.update(ActivityContent(...))` - iOS 16.2+

## [0.5.1] - 2026-01-28

### Fixed
- **Critical**: Push token race condition - tokens arriving before JS listener was ready were silently dropped
- Added token buffering: tokens received before `addListener()` are now queued and emitted when listener connects

## [0.5.0] - 2026-01-28

### Changed
- **BREAKING**: Live Activity now requires bridge registration
- Removed internal `SeennJobAttributes` to fix "ActivityInput error 0" iOS module isolation bug
- Added `SeennLiveActivityBridge` protocol for app-level implementation
- Added `SeennLiveActivityRegistry` for bridge registration
- Added `isBridgeRegistered()` method

### Added
- `templates/SeennLiveActivityBridge/SeennLiveActivityBridgeImpl.swift` - Bridge implementation template

### Migration
Users must now:
1. Copy `SeennLiveActivityBridgeImpl.swift` to their Xcode project
2. Copy `SeennJobAttributes.swift` from templates to app and Widget Extension
3. Register bridge in AppDelegate: `SeennLiveActivityRegistry.shared.register(SeennLiveActivityBridgeImpl.shared)`
4. See docs: https://docs.seenn.io/client/react-native#live-activity-setup

## [0.4.3] - 2026-01-27

### Changed
- Auth prefix bypass for self-hosted (pk_/sk_ validation skipped when baseUrl != api.seenn.io)
- Configurable `basePath` (default: `/v1`)

## [0.4.2] - 2026-01-24

### Fixed
- SSE reconnection handling

## [0.4.1] - 2026-01-24

### Changed
- Renamed `authToken` → `apiKey` in SeennConfig for consistency

## [0.4.0] - 2026-01-24

### Added
- Polling mode support (`mode: 'polling'`)
- `pollInterval` configuration option
- `subscribeJobForPolling()` method

## [0.3.0] - 2026-01-23

### Added
- Android Ongoing Notification support
- ETA countdown with `useEtaCountdown()` hook
- Parent-Child jobs support

## [0.2.0] - 2026-01-22

### Added
- iOS Live Activity support
- `useLiveActivity()` hook
- Multi-job Live Activity (up to 5 concurrent)
- Push token events

## [0.1.0] - 2026-01-22

### Added
- Initial release
- SSE real-time updates
- `useSeennJob()` hook
- TypeScript support
