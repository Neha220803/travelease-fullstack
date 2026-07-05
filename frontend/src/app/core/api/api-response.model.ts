/** Successful API response envelope from the TravelEase backend */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

/** Failed API response envelope */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}
