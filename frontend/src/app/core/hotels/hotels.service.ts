import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { Hotel } from '@app/core/hotels/hotel.models';

@Injectable({ providedIn: 'root' })
export class HotelsService {
  private readonly http = inject(HttpClient);

  searchHotels(destinationId: number, query?: string): Observable<Hotel[]> {
    let params = new HttpParams().set('destinationId', destinationId);
    if (query) {
      params = params.set('q', query);
    }
    return this.http
      .get<ApiResponse<Hotel[]>>(`${API_BASE_URL}/api/hotels`, { params })
      .pipe(map((response) => response.data));
  }
}
