# @seenn/react-native

> **Open Source Job State Transport SDK for React Native**

[![npm version](https://badge.fury.io/js/@seenn%2Freact-native.svg)](https://www.npmjs.com/package/@seenn/react-native)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Real-time job tracking with Live Activity support for React Native apps. Perfect for AI video generation, image processing, and long-running async tasks.

## Features

- ✅ **Real-time updates** via Server-Sent Events (SSE) or Polling
- ✅ **iOS Live Activity** - Lock Screen & Dynamic Island (iOS 16.1+)
- ✅ **Android Ongoing Notification** - Persistent foreground notification
- ✅ **Multi-job support** - Track up to 5 concurrent Live Activities
- ✅ **React hooks** for easy integration
- ✅ **TypeScript** support
- ✅ **Auto-reconnection** with exponential backoff
- ✅ **Offline queue** (missed events replay)
- ✅ **Parent-child jobs** tracking
- ✅ **ETA countdown** with confidence scoring
- ✅ **Polling mode** for self-hosted backends **NEW in v0.4.0**
- ✅ **Open source** (MIT License)

---

## Installation

```bash
npm install @seenn/react-native
# or
yarn add @seenn/react-native
# or
pnpm add @seenn/react-native
```

---

## Quick Start

### 1. Initialize SDK

```typescript
import { Seenn } from '@seenn/react-native';

const seenn = new Seenn({
  baseUrl: 'https://api.seenn.io', // Seenn Cloud
  // OR
  baseUrl: 'https://api.yourapp.com', // Your own backend
  authToken: 'your_jwt_token',
  debug: true, // Enable logging
});
```

### 2. Connect to SSE

```typescript
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Connect to SSE for real-time updates
    seenn.connect('user_123');

    // Cleanup on unmount
    return () => {
      seenn.disconnect();
    };
  }, []);

  return <YourApp />;
}
```

### 3. Track a Job

```typescript
import { useSeennJob } from '@seenn/react-native';

function VideoGenerationScreen({ jobId }) {
  const job = useSeennJob(seenn, jobId);

  if (!job) return <Text>Loading...</Text>;

  return (
    <View>
      <Text>{job.title}</Text>
      <ProgressBar value={job.progress || 0} />
      {job.eta && <Text>ETA: {job.eta}s</Text>}
      {job.stage && (
        <Text>
          Stage: {job.stage.label} ({job.stage.index}/{job.stage.total})
        </Text>
      )}
    </View>
  );
}
```

---

## Polling Mode (Self-Hosted)

For simpler self-hosted setups without SSE infrastructure:

```typescript
const seenn = new Seenn({
  baseUrl: 'https://api.yourcompany.com',
  authToken: 'your_token',
  mode: 'polling',        // Use polling instead of SSE
  pollInterval: 5000,     // Poll every 5 seconds
});

await seenn.connect(userId);

// Subscribe to specific jobs for polling
seenn.subscribeJobForPolling('job_123');
seenn.subscribeJobsForPolling(['job_456', 'job_789']);

// Jobs auto-unsubscribe when completed/failed/cancelled
```

---

## React Hooks

### `useSeennJob(seenn, jobId)`

Track a specific job.

```typescript
import { useSeennJob } from '@seenn/react-native';

function JobTracker({ jobId }) {
  const job = useSeennJob(seenn, jobId);

  if (!job) return <Text>Job not found</Text>;

  return (
    <View>
      <Text>Status: {job.status}</Text>
      <Text>Progress: {job.progress}%</Text>
    </View>
  );
}
```

### `useSeennJobProgress(seenn, jobId, callbacks)`

Track job with lifecycle callbacks.

```typescript
import { useSeennJobProgress } from '@seenn/react-native';

function VideoGenerator({ jobId }) {
  const job = useSeennJobProgress(seenn, jobId, {
    onProgress: (job) => {
      console.log(`Progress: ${job.progress}%`);
    },
    onComplete: (job) => {
      Alert.alert('Done!', 'Video is ready');
      // Navigate to result screen
    },
    onFailed: (job) => {
      Alert.alert('Error', job.error?.message);
    },
  });

  return <ProgressView job={job} />;
}
```

### `useSeennJobs(seenn)`

Get all tracked jobs.

```typescript
import { useSeennJobs } from '@seenn/react-native';

function JobList() {
  const jobs = useSeennJobs(seenn);

  return (
    <FlatList
      data={Array.from(jobs.values())}
      keyExtractor={(job) => job.jobId}
      renderItem={({ item }) => <JobCard job={item} />}
    />
  );
}
```

### `useSeennConnectionState(seenn)`

Monitor connection state.

```typescript
import { useSeennConnectionState } from '@seenn/react-native';

function ConnectionIndicator() {
  const state = useSeennConnectionState(seenn);

  return (
    <View style={[styles.indicator, { backgroundColor: getColor(state) }]}>
      <Text>{state}</Text>
    </View>
  );
}

function getColor(state) {
  switch (state) {
    case 'connected':
      return 'green';
    case 'connecting':
    case 'reconnecting':
      return 'orange';
    default:
      return 'red';
  }
}
```

### `useSeennJobsByStatus(seenn, status)`

Filter jobs by status.

```typescript
import { useSeennJobsByStatus } from '@seenn/react-native';

function RunningJobs() {
  const runningJobs = useSeennJobsByStatus(seenn, 'running');

  return <Text>{runningJobs.length} jobs running</Text>;
}
```

---

## iOS Live Activity

Show job progress on the Lock Screen and Dynamic Island (iOS 16.1+).

### Setup

**1. Add Widget Extension to your Xcode project:**

1. Open your iOS project in Xcode
2. File → New → Target → Widget Extension
3. Name it `SeennWidgetExtension`
4. Copy files from `node_modules/@seenn/react-native/templates/SeennWidgetExtension/`

**2. Add NSSupportsLiveActivities to Info.plist:**

```xml
<key>NSSupportsLiveActivities</key>
<true/>
```

**3. Run pod install:**

```bash
cd ios && pod install
```

### Usage: Auto-Sync Mode (Recommended)

```typescript
import { useSeennJob, useLiveActivity } from '@seenn/react-native';

function JobScreen({ jobId }) {
  const job = useSeennJob(seenn, jobId);

  // Auto-sync job state with Live Activity
  const { isActive, isSupported } = useLiveActivity(job, {
    autoStart: true,  // Start when job begins running
    autoEnd: true,    // End when job completes/fails
    dismissAfter: 300, // Keep on screen 5 min after completion
  });

  return (
    <View>
      <Text>{job?.title}</Text>
      <Text>Progress: {job?.progress}%</Text>
      {isSupported && <Text>Live Activity: {isActive ? 'On' : 'Off'}</Text>}
    </View>
  );
}
```

### Usage: Manual Control

```typescript
import { LiveActivity } from '@seenn/react-native';

// Check support
const supported = await LiveActivity.isSupported();

// Start activity
const result = await LiveActivity.start({
  jobId: 'job_123',
  title: 'Generating video...',
  jobType: 'video-generation',
  initialProgress: 0,
});

// Update progress
await LiveActivity.update({
  jobId: 'job_123',
  progress: 50,
  status: 'running',
  message: 'Encoding frames...',
  stageName: 'Encoding',
  stageIndex: 2,
  stageTotal: 3,
});

// End activity
await LiveActivity.end({
  jobId: 'job_123',
  finalStatus: 'completed',
  message: 'Video ready!',
  resultUrl: 'https://example.com/video.mp4',
  dismissAfter: 300,
});

// Get active activities
const activeIds = await LiveActivity.getActiveIds();
// ['job_123', 'job_456']

// Cancel all
await LiveActivity.cancelAll();
```

### Multi-Job Support

iOS allows up to 5 concurrent Live Activities per app:

```typescript
// Start multiple activities
await LiveActivity.start({ jobId: 'job_1', title: 'Video 1', ... });
await LiveActivity.start({ jobId: 'job_2', title: 'Video 2', ... });
await LiveActivity.start({ jobId: 'job_3', title: 'Image Pack', ... });

// Each updates independently
await LiveActivity.update({ jobId: 'job_1', progress: 50, ... });
await LiveActivity.update({ jobId: 'job_2', progress: 75, ... });

// Check which are active
const activeIds = await LiveActivity.getActiveIds();
console.log(activeIds); // ['job_1', 'job_2', 'job_3']
```

### Push Token for Background Updates

```typescript
import { LiveActivity } from '@seenn/react-native';

// Listen for push tokens
const unsubscribe = LiveActivity.onPushToken((event) => {
  console.log(`Token for ${event.jobId}: ${event.token}`);
  // Send to your backend for APNs push updates
  sendTokenToBackend(event.jobId, event.token);
});

// Later: unsubscribe()
```

---

## Expo Support

For Expo projects, Live Activity works via `expo-live-activity` (Software Mansion).

> **Note:** Requires Expo Dev Client. Not compatible with Expo Go.

### Installation (Expo)

```bash
# If you already have @seenn/react-native installed:
npx expo install expo-live-activity

# Fresh installation (both packages):
npx expo install expo-live-activity @seenn/react-native
```

### Configuration (app.json)

```json
{
  "expo": {
    "plugins": ["expo-live-activity"]
  }
}
```

### Prebuild

```bash
npx expo prebuild --clean
```

### Usage: useExpoLiveActivity Hook

```typescript
import { useSeennJob, useExpoLiveActivity } from '@seenn/react-native';

function JobScreen({ jobId }) {
  const job = useSeennJob(seenn, jobId);

  // Auto-sync with Expo Live Activity
  const { isActive, isSupported } = useExpoLiveActivity(job, {
    autoStart: true,
    autoEnd: true,
    colors: {
      backgroundColor: '#1c1c1e',
      progressTint: '#3b82f6',
    },
    deepLinkUrl: 'myapp://jobs/job_123',
  });

  return (
    <View>
      <Text>{job?.title}</Text>
      <Text>Progress: {job?.progress}%</Text>
    </View>
  );
}
```

### Usage: Manual Control (Expo)

```typescript
import { ExpoLiveActivity } from '@seenn/react-native';

// Check if available
const isAvailable = ExpoLiveActivity.isAvailable();

// Start activity
const activityId = await ExpoLiveActivity.start(job, {
  backgroundColor: '#1c1c1e',
  progressViewTint: '#3b82f6',
});

// Update activity
await ExpoLiveActivity.update(activityId, job);

// Stop activity
await ExpoLiveActivity.stop(activityId, job);
```

### Expo vs Native Module

| Feature | Native Module | Expo (expo-live-activity) |
|---------|--------------|---------------------------|
| Setup | Manual Xcode | `npx expo prebuild` |
| Custom UI | Full SwiftUI | Config-based |
| Expo Go | No | No |
| Dev Client | No | Yes |
| Multi-job | Yes (5 max) | Yes (5 max) |

---

## Manual Subscription (Without Hooks)

If you're not using React hooks, you can subscribe manually:

```typescript
// Subscribe to a job
const unsubscribe = seenn.subscribeToJob('job_123', (job) => {
  console.log(`Job updated:`, job);
});

// Unsubscribe when done
unsubscribe();

// Subscribe to connection state
const unsubscribeState = seenn.subscribeToConnectionState((state) => {
  console.log(`Connection: ${state}`);
});

// Synchronous access
const currentJob = seenn.getJob('job_123');
const allJobs = seenn.getAllJobs();
const state = seenn.getConnectionState();
```

---

## Configuration Options

```typescript
const seenn = new Seenn({
  // Required
  baseUrl: 'https://api.seenn.io',

  // Optional
  authToken: 'your_jwt_token', // For authentication
  sseUrl: 'https://api.seenn.io/v1/sse', // Custom SSE endpoint
  reconnect: true, // Auto-reconnect on disconnect
  reconnectInterval: 1000, // Initial reconnect delay (ms)
  maxReconnectAttempts: 10, // Max reconnect attempts
  debug: false, // Enable debug logging
});
```

---

## Self-Hosted Backend

**Seenn Cloud (Recommended):**

```typescript
const seenn = new Seenn({
  baseUrl: 'https://api.seenn.io',
  authToken: 'your_api_key',
});
```

**Your Own Backend (Self-Hosted):**

```typescript
const seenn = new Seenn({
  baseUrl: 'https://api.yourapp.com',
  authToken: 'your_jwt_token',
});
```

**Requirements for self-hosted:**

1. Implement SSE endpoint (`GET /v1/sse?userId={userId}`)
2. Follow [Seenn protocol spec](https://docs.seenn.io/self-hosted/protocol-spec)
3. Handle job state management (DynamoDB or PostgreSQL)
4. Set up Redis pub/sub for real-time events

See [Self-Hosted Guide](https://docs.seenn.io/self-hosted) for details.

---

## Example: AI Video Generation

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { Seenn, useSeennJobProgress } from '@seenn/react-native';

const seenn = new Seenn({
  baseUrl: 'https://api.yourapp.com',
  authToken: 'user_jwt_token',
});

function VideoGeneratorScreen() {
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    seenn.connect('user_123');
    return () => seenn.disconnect();
  }, []);

  const startGeneration = async () => {
    const response = await fetch('https://api.yourapp.com/v1/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A cat playing piano',
        duration: 5,
      }),
    });
    const { jobId } = await response.json();
    setJobId(jobId);
  };

  if (!jobId) {
    return <Button title="Generate Video" onPress={startGeneration} />;
  }

  return <VideoProgress jobId={jobId} />;
}

function VideoProgress({ jobId }: { jobId: string }) {
  const job = useSeennJobProgress(seenn, jobId, {
    onComplete: (job) => {
      console.log('Video ready:', job.result?.url);
    },
    onFailed: (job) => {
      console.error('Failed:', job.error?.message);
    },
  });

  if (!job) return <ActivityIndicator />;

  return (
    <View>
      <Text>{job.title}</Text>
      <Text>Status: {job.status}</Text>
      {job.progress !== undefined && <Text>Progress: {job.progress}%</Text>}
      {job.stage && (
        <Text>
          {job.stage.label} ({job.stage.index}/{job.stage.total})
        </Text>
      )}
      {job.eta && <Text>ETA: {job.eta}s</Text>}
      {job.queue && <Text>Queue: {job.queue.position}/{job.queue.total}</Text>}
      {job.status === 'completed' && job.result && (
        <Text>Video URL: {job.result.url}</Text>
      )}
      {job.status === 'failed' && job.error && (
        <Text style={{ color: 'red' }}>Error: {job.error.message}</Text>
      )}
    </View>
  );
}

export default VideoGeneratorScreen;
```

---

## TypeScript Types

```typescript
interface SeennJob {
  jobId: string;
  userId: string;
  appId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  title: string;
  progress?: number; // 0-100
  stage?: StageInfo;
  eta?: number; // seconds
  queue?: QueueInfo;
  result?: JobResult;
  error?: JobError;
  // Parent-child jobs
  parentJobId?: string;
  childProgressMode?: 'average' | 'weighted' | 'sequential';
  children?: ChildJob[];
  childrenCompleted?: number;
  childrenTotal?: number;
  createdAt: string;
  updatedAt: string;
}

interface StageInfo {
  id: string;
  label: string;
  index: number; // Current stage
  total: number; // Total stages
}

interface QueueInfo {
  position: number;
  total: number;
  estimatedWaitSeconds?: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
```

---

## FAQ

### How does this differ from polling?

**Polling (old way):**

```typescript
// ❌ Inefficient, high latency, server load
setInterval(async () => {
  const job = await fetch(`/jobs/${jobId}`);
  updateUI(job);
}, 2000); // Check every 2 seconds
```

**Seenn SSE (better):**

```typescript
// ✅ Real-time, low latency, efficient
const job = useSeennJob(seenn, jobId);
// Updates instantly when job changes
```

### Does this work offline?

Yes! Seenn buffers missed events for 30 seconds. When you reconnect, missed updates are replayed automatically.

### What's the cost?

- **Seenn Cloud**: $0-399/mo based on job volume
- **Self-Hosted**: $0 SDK (open source), your infrastructure cost

### Can I use this without Seenn Cloud?

Yes! The SDK is open source (MIT). You can:

1. Use Seenn Cloud (recommended, easy)
2. Self-host with your own backend ([guide](https://docs.seenn.io/self-hosted))

### Does this support iOS Live Activity?

**Yes!** As of v0.2.0, iOS Live Activity is fully supported. See the [Live Activity Setup](#ios-live-activity) section.

---

## Links

- 📖 [Documentation](https://docs.seenn.io)
- 🌐 [Website](https://seenn.io)
- 💬 [Discord](https://discord.gg/seenn)
- 🐙 [GitHub](https://github.com/seenn-io/sdk)
- 📦 [npm](https://www.npmjs.com/package/@seenn/react-native)

---

## License

MIT © [Seenn](https://seenn.io)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/seenn-io/sdk/blob/main/CONTRIBUTING.md)

```bash
git clone https://github.com/seenn-io/sdk
cd seenn-sdk
pnpm install
pnpm --filter @seenn/react-native dev
```

---

Made with ❤️ by [Seenn](https://seenn.io)
