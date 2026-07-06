import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiError, ApiErrorResponse, ApiResponse } from './api-response.model';

/** Injection token for the backend base URL. Override in tests or environments. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8080',
});

/**
 * Central HTTP wrapper. Unwraps the backend ApiResponse<T> envelope.
 * All methods throw ApiError on failure so components only handle typed errors.
 */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http
      .get<ApiResponse<T> | ApiErrorResponse>(`${this.baseUrl}${path}`, { params: httpParams })
      .pipe(map(this.unwrap));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T> | ApiErrorResponse>(`${this.baseUrl}${path}`, body)
      .pipe(map(this.unwrap));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T> | ApiErrorResponse>(`${this.baseUrl}${path}`, body)
      .pipe(map(this.unwrap));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T> | ApiErrorResponse>(`${this.baseUrl}${path}`, body ?? null)
      .pipe(map(this.unwrap));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T> | ApiErrorResponse>(`${this.baseUrl}${path}`)
      .pipe(map(this.unwrap));
  }

  private unwrap<T>(response: ApiResponse<T> | ApiErrorResponse): T {
    if (!response.success) {
      throw (response as ApiErrorResponse).error as ApiError;
    }
    return (response as ApiResponse<T>).data;
  }
}
