// Seenn React Native SDK - Push Token Hook
// MIT License - Open Source

import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { LiveActivity, PushAuthorizationStatus } from '../native/LiveActivity';

export interface UseSeennPushOptions {
  /**
   * Whether to automatically refresh the device token on mount
   * if push authorization is already granted.
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Callback when a device push token is received.
   * Use this to register the token with your backend.
   */
  onTokenReceived?: (token: string) => void;

  /**
   * Callback when push authorization status changes or is checked.
   */
  onAuthorizationStatus?: (status: PushAuthorizationStatus) => void;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;
}

export interface UseSeennPushResult {
  /**
   * Current device push token (null if not yet received)
   */
  token: string | null;

  /**
   * Current push authorization status
   */
  authorizationStatus: PushAuthorizationStatus;

  /**
   * Whether the hook is currently loading (checking status or refreshing)
   */
  isLoading: boolean;

  /**
   * Request provisional push authorization (no prompt, quiet notifications)
   */
  requestProvisional: () => Promise<boolean>;

  /**
   * Request standard push authorization (shows permission prompt)
   */
  requestStandard: () => Promise<boolean>;

  /**
   * Manually refresh the device push token
   */
  refreshToken: () => Promise<boolean>;
}

/**
 * Hook for managing push notifications with Seenn SDK.
 *
 * Automatically handles:
 * - Token refresh on app launch (if already authorized)
 * - AppDelegate swizzling
 * - Token delivery via callback
 *
 * @example
 * ```typescript
 * import { useSeennPush } from '@seenn/react-native';
 *
 * function App() {
 *   const { token, authorizationStatus, requestProvisional } = useSeennPush({
 *     onTokenReceived: async (token) => {
 *       // Register token with your backend
 *       await api.registerDevice({ userId, deviceToken: token });
 *     },
 *   });
 *
 *   useEffect(() => {
 *     if (authorizationStatus === 'notDetermined') {
 *       // Request provisional push (no prompt)
 *       requestProvisional();
 *     }
 *   }, [authorizationStatus]);
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useSeennPush(options: UseSeennPushOptions = {}): UseSeennPushResult {
  const { autoRefresh = true, onTokenReceived, onAuthorizationStatus, onError } = options;

  const [token, setToken] = useState<string | null>(null);
  const [authorizationStatus, setAuthorizationStatus] =
    useState<PushAuthorizationStatus>('notDetermined');
  const [isLoading, setIsLoading] = useState(true);

  // Refs to avoid stale closures
  const onTokenReceivedRef = useRef(onTokenReceived);
  const onAuthorizationStatusRef = useRef(onAuthorizationStatus);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onTokenReceivedRef.current = onTokenReceived;
  }, [onTokenReceived]);

  useEffect(() => {
    onAuthorizationStatusRef.current = onAuthorizationStatus;
  }, [onAuthorizationStatus]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Check authorization status
  const checkStatus = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    try {
      const info = await LiveActivity.getPushAuthorizationStatus();
      setAuthorizationStatus(info.status);
      onAuthorizationStatusRef.current?.(info.status);
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;

    try {
      return await LiveActivity.refreshDevicePushToken();
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []);

  // Request provisional authorization
  const requestProvisional = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;

    try {
      setIsLoading(true);
      const granted = await LiveActivity.requestProvisionalPushAuthorization();
      await checkStatus();
      return granted;
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  // Request standard authorization
  const requestStandard = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;

    try {
      setIsLoading(true);
      const granted = await LiveActivity.requestStandardPushAuthorization();
      await checkStatus();
      return granted;
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  // Setup push token listener
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    const unsubscribe = LiveActivity.onPushToken((event) => {
      if (event.type === 'device') {
        setToken(event.token);
        onTokenReceivedRef.current?.(event.token);
      }
    });

    return unsubscribe;
  }, []);

  // Check status and optionally refresh token on mount
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        await checkStatus();

        if (autoRefresh) {
          await refreshToken();
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [autoRefresh, checkStatus, refreshToken]);

  return {
    token,
    authorizationStatus,
    isLoading,
    requestProvisional,
    requestStandard,
    refreshToken,
  };
}

export default useSeennPush;
