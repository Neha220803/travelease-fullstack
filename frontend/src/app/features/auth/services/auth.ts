import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);

  login(credentials: any): Observable<any> {
    return this.api.post<any>('/api/auth/login', credentials);
  }

  register(userData: any): Observable<any> {
    return this.api.post<any>('/api/auth/register', userData);
  }
}
