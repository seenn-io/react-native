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

  /**
   * Enable debug logging in development mode.
   * Logs all hook operations to console.
   * @default false
   */
  debug?: boolean;
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
 * import { useSeennPush, SeennErrorCode } from '@seenn/react-native';
 *
 * function App() {
 *   const { token, authorizationStatus, requestProvisional } = useSeennPush({
 *     debug: __DEV__, // Enable debug logs in development
 *     onTokenReceived: async (token) => {
 *       // Register token with your backend
 *       await api.registerDevice({ userId, deviceToken: token });
 *     },
 *     onError: (error) => {
 *       console.error('Push error:', error);
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
  const {
    autoRefresh = true,
    onTokenReceived,
    onAuthorizationStatus,
    onError,
    debug = false,
  } = options;

  const [token, setToken] = useState<string | null>(null);
  const [authorizationStatus, setAuthorizationStatus] =
    useState<PushAuthorizationStatus>('notDetermined');
  const [isLoading, setIsLoading] = useState(true);

  // Refs to avoid stale closures
  const onTokenReceivedRef = useRef(onTokenReceived);
  const onAuthorizationStatusRef = useRef(onAuthorizationStatus);
  const onErrorRef = useRef(onError);

  // Debug logging helper
  const log = useCallback(
    (message: string, data?: unknown) => {
      if (debug && __DEV__) {
        if (data !== undefined) {
          console.log(`[Seenn Push] ${message}`, data);
        } else {
          console.log(`[Seenn Push] ${message}`);
        }
      }
    },
    [debug]
  );

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
      log('Not on iOS, skipping status check');
      setIsLoading(false);
      return;
    }

    try {
      log('Checking authorization status...');
      const info = await LiveActivity.getPushAuthorizationStatus();
      log('Authorization status:', info.status);
      setAuthorizationStatus(info.status);
      onAuthorizationStatusRef.current?.(info.status);
    } catch (error) {
      log('Error checking status:', error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [log]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      log('Not on iOS, skipping token refresh');
      return false;
    }

    try {
      log('Refreshing device token...');
      const success = await LiveActivity.refreshDevicePushToken();
      log('Token refresh result:', success);
      return success;
    } catch (error) {
      log('Error refreshing token:', error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [log]);

  // Request provisional authorization
  const requestProvisional = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      log('Not on iOS, skipping provisional request');
      return false;
    }

    try {
      setIsLoading(true);
      log('Requesting provisional authorization...');
      const granted = await LiveActivity.requestProvisionalPushAuthorization();
      log('Provisional authorization result:', granted);
      await checkStatus();
      return granted;
    } catch (error) {
      log('Error requesting provisional:', error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus, log]);

  // Request standard authorization
  const requestStandard = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      log('Not on iOS, skipping standard request');
      return false;
    }

    try {
      setIsLoading(true);
      log('Requesting standard authorization...');
      const granted = await LiveActivity.requestStandardPushAuthorization();
      log('Standard authorization result:', granted);
      await checkStatus();
      return granted;
    } catch (error) {
      log('Error requesting standard:', error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus, log]);

  // Setup push token listener
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      log('Not on iOS, skipping token listener setup');
      setIsLoading(false);
      return;
    }

    log('Setting up push token listener...');
    const unsubscribe = LiveActivity.onPushToken((event) => {
      if (event.type === 'device') {
        log('Device token received:', event.token.substring(0, 20) + '...');
        setToken(event.token);
        onTokenReceivedRef.current?.(event.token);
      }
    });

    return () => {
      log('Cleaning up push token listener');
      unsubscribe();
    };
  }, [log]);

  // Check status and optionally refresh token on mount
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      log('Initializing push hook...');
      try {
        await checkStatus();

        if (autoRefresh) {
          log('Auto-refresh enabled, refreshing token...');
          await refreshToken();
        }
      } finally {
        log('Push hook initialization complete');
        setIsLoading(false);
      }
    };

    init();
  }, [autoRefresh, checkStatus, refreshToken, log]);

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
