import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api = inject(ApiService);

  getDashboardStats(): Observable<any> {
    return this.api.get<any>('/api/admin/dashboard');
  }
}
