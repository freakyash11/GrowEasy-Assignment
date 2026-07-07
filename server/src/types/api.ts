/**
 * Standard API response envelope types.
 * Use these to keep all responses consistent across the application.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  stack?: string; // only in development
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
