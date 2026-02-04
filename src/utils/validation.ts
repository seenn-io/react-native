// Seenn React Native SDK - Input Validation
// MIT License - Open Source

import { SeennErrorCode } from '../errors/codes';

export interface ValidationError {
  message: string;
  code: SeennErrorCode;
}

/**
 * Validate a jobId parameter
 * @returns ValidationError if invalid, null if valid
 */
export function validateJobId(jobId: string | undefined | null): ValidationError | null {
  if (jobId === undefined || jobId === null) {
    return {
      message: 'jobId is required',
      code: SeennErrorCode.INVALID_JOB_ID,
    };
  }
  if (typeof jobId !== 'string') {
    return {
      message: 'jobId must be a string',
      code: SeennErrorCode.INVALID_JOB_ID,
    };
  }
  if (jobId.trim() === '') {
    return {
      message: 'jobId cannot be empty',
      code: SeennErrorCode.INVALID_JOB_ID,
    };
  }
  if (jobId.length > 128) {
    return {
      message: 'jobId must be 128 characters or less',
      code: SeennErrorCode.INVALID_JOB_ID,
    };
  }
  return null;
}

/**
 * Validate a progress value (0-100)
 * @returns ValidationError if invalid, null if valid
 */
export function validateProgress(progress: number | undefined | null): ValidationError | null {
  if (progress === undefined || progress === null) {
    return null; // Optional field
  }
  if (typeof progress !== 'number' || isNaN(progress)) {
    return {
      message: 'progress must be a number',
      code: SeennErrorCode.INVALID_PROGRESS,
    };
  }
  if (progress < 0 || progress > 100) {
    return {
      message: 'progress must be between 0 and 100',
      code: SeennErrorCode.INVALID_PROGRESS,
    };
  }
  return null;
}

/**
 * Validate a title parameter
 * @returns ValidationError if invalid, null if valid
 */
export function validateTitle(title: string | undefined | null): ValidationError | null {
  if (title === undefined || title === null) {
    return {
      message: 'title is required',
      code: SeennErrorCode.INVALID_TITLE,
    };
  }
  if (typeof title !== 'string') {
    return {
      message: 'title must be a string',
      code: SeennErrorCode.INVALID_TITLE,
    };
  }
  if (title.trim() === '') {
    return {
      message: 'title cannot be empty',
      code: SeennErrorCode.INVALID_TITLE,
    };
  }
  return null;
}

/**
 * Validate a status value
 * @returns ValidationError if invalid, null if valid
 */
export function validateStatus(
  status: string | undefined | null,
  allowedValues: readonly string[]
): ValidationError | null {
  if (status === undefined || status === null) {
    return {
      message: 'status is required',
      code: SeennErrorCode.INVALID_STATUS,
    };
  }
  if (typeof status !== 'string') {
    return {
      message: 'status must be a string',
      code: SeennErrorCode.INVALID_STATUS,
    };
  }
  if (!allowedValues.includes(status)) {
    return {
      message: `status must be one of: ${allowedValues.join(', ')}`,
      code: SeennErrorCode.INVALID_STATUS,
    };
  }
  return null;
}
