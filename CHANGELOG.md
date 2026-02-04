# Changelog

All notable changes to this project will be documented in this file.

## [0.9.10] - 2026-02-04

### Added
- **SDK Version Info** - Programmatic access to SDK version
  - `SDK_VERSION` - Current SDK version string
  - `SDK_NAME` - Package name (`@seenn/react-native`)
  - `SDK_USER_AGENT` - For API request headers

- **Error Codes** - Standardized error codes for all operations
  - `SeennErrorCode` - Enum with all error codes
  - All `LiveActivityResult` now includes `code` field for programmatic error handling
  - Codes: `PLATFORM_NOT_SUPPORTED`, `INVALID_JOB_ID`, `INVALID_PROGRESS`, `ACTIVITY_NOT_FOUND`, etc.

- **Input Validation** - Client-side validation before native calls
  - Validates jobId, title, progress, status
  - Returns specific error codes for invalid inputs
  - `validateJobId()`, `validateTitle()`, `validateProgress()`, `validateStatus()` utilities exported

- **Debug Mode** - Enhanced debugging for `useSeennPush` hook
  - `debug: true` option enables detailed console logs
  - Logs all operations: token refresh, authorization checks, errors

### Changed
- `LiveActivity.update()` now returns `LiveActivityResult` instead of `boolean` for consistency
- `LiveActivity.end()` now returns `LiveActivityResult` instead of `boolean` for consistency
- `LiveActivity.cancel()` now returns `LiveActivityResult` instead of `boolean` for consistency
- `LiveActivity.cancelAll()` now returns `LiveActivityResult` instead of `boolean` for consistency
- Android calls now log warning in dev mode instead of silent no-op

### Example
```typescript
import { LiveActivity, SeennErrorCode, SDK_VERSION } from '@seenn/react-native';

console.log('SDK Version:', SDK_VERSION); // '0.9.10'

const result = await LiveActivity.start({ jobId: '', title: 'Test' });
if (!result.success) {
  if (result.code === SeennErrorCode.INVALID_JOB_ID) {
    console.log('Invalid job ID!');
  }
}
```

## [0.9.9] - 2026-02-04

### Added
- **Auto Push Token Registration** - SDK now automatically captures device push tokens on app restart
  - `refreshDevicePushToken()` - Refresh token if authorization already granted (call on app launch)
  - `useSeennPush()` hook - Convenience hook for push token management with auto-refresh
  - Auto-swizzle on SDK init - No longer requires permission request to setup token capture

### Why This Matters
Previously, if a user granted push permission and then restarted the app, the device token would not be captured because swizzling only happened during permission request. Now the SDK swizzles immediately on init, ensuring tokens are always captured.

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
