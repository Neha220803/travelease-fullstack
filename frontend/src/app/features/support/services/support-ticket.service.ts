import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  CreateTicketPayload,
  SupportTicket,
  SupportTicketDetail,
  TicketCategory,
  TicketReply,
  TicketStatus,
} from '@app/features/support/services/support-ticket.models';

@Injectable({ providedIn: 'root' })
export class SupportTicketService {
  private readonly http = inject(HttpClient);

  createTicket(payload: CreateTicketPayload): Observable<SupportTicket> {
    return this.http
      .post<ApiResponse<SupportTicket>>(`${API_BASE_URL}/api/support/tickets`, payload)
      .pipe(map((response) => response.data));
  }

  getMyTickets(): Observable<SupportTicket[]> {
    return this.http
      .get<ApiResponse<SupportTicket[]>>(`${API_BASE_URL}/api/support/tickets`)
      .pipe(map((response) => response.data));
  }

  getMyTicket(ticketId: string): Observable<SupportTicketDetail> {
    return this.http
      .get<ApiResponse<SupportTicketDetail>>(`${API_BASE_URL}/api/support/tickets/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  getAllTickets(category?: TicketCategory, status?: TicketStatus): Observable<SupportTicket[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiResponse<SupportTicket[]>>(`${API_BASE_URL}/api/admin/support/tickets`, { params })
      .pipe(map((response) => response.data));
  }

  getTicketForAdmin(ticketId: string): Observable<SupportTicketDetail> {
    return this.http
      .get<ApiResponse<SupportTicketDetail>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  addReplyAdmin(ticketId: string, message: string): Observable<TicketReply> {
    return this.http
      .post<ApiResponse<TicketReply>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/replies`, { message })
      .pipe(map((response) => response.data));
  }

  updateStatusAdmin(ticketId: string, status: TicketStatus): Observable<SupportTicket> {
    return this.http
      .patch<ApiResponse<SupportTicket>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/status`, { status })
      .pipe(map((response) => response.data));
  }

  // Traveler reply
  addReply(ticketId: string, message: string): Observable<TicketReply> {
    return this.http
      .post<ApiResponse<TicketReply>>(`${API_BASE_URL}/api/support/tickets/${ticketId}/replies`, { message })
      .pipe(map((response) => response.data));
  }

  // Provider Endpoints
  getProviders(type?: string): Observable<import('./support-ticket.models').Provider[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.http
      .get<ApiResponse<import('./support-ticket.models').Provider[]>>(`${API_BASE_URL}/api/providers`, { params })
      .pipe(map((response) => response.data));
  }

  getAssignedTickets(): Observable<SupportTicket[]> {
    return this.http
      .get<ApiResponse<SupportTicket[]>>(`${API_BASE_URL}/api/provider/support/tickets/assigned`)
      .pipe(map((response) => response.data));
  }

  getAssignedTicket(ticketId: string): Observable<SupportTicketDetail> {
    return this.http
      .get<ApiResponse<SupportTicketDetail>>(`${API_BASE_URL}/api/provider/support/tickets/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  addReplyProvider(ticketId: string, message: string): Observable<TicketReply> {
    return this.http
      .post<ApiResponse<TicketReply>>(`${API_BASE_URL}/api/provider/support/tickets/${ticketId}/replies`, { message })
      .pipe(map((response) => response.data));
  }

  updateStatusProvider(ticketId: string, status: TicketStatus): Observable<SupportTicket> {
    return this.http
      .patch<ApiResponse<SupportTicket>>(`${API_BASE_URL}/api/provider/support/tickets/${ticketId}/status`, { status })
      .pipe(map((response) => response.data));
  }
}
