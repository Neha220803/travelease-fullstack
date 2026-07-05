import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Invitation } from '@app/core/models/invitation.model';
import { MOCK_INVITATIONS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class InvitationsDummyService {
  /** TODO: POST /api/invitations */
  createInvitation(tripId: string, inviteeEmail: string): Observable<Invitation> {
    const inv: Invitation = {
      id: `inv${Date.now()}`,
      tripId,
      tripName: 'My Trip',
      tripDestination: '',
      tripStartDate: '',
      inviterId: 'u1',
      inviterName: 'You',
      inviteeEmail,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    return of(inv).pipe(delay(500));
  }

  /** TODO: POST /api/invitations/bulk */
  bulkInvite(tripId: string, inviteeEmails: string[]): Observable<Invitation[]> {
    const invs = inviteeEmails.map((email, i) => ({
      id: `inv${Date.now()}${i}`,
      tripId,
      tripName: 'My Trip',
      tripDestination: '',
      tripStartDate: '',
      inviterId: 'u1',
      inviterName: 'You',
      inviteeEmail: email,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    }));
    return of(invs).pipe(delay(600));
  }

  /** TODO: GET /api/invitations (my invitations) */
  getMyInvitations(): Observable<Invitation[]> {
    return of([...MOCK_INVITATIONS]).pipe(delay(400));
  }

  /** TODO: PATCH /api/invitations/{invitationId}/accept */
  acceptInvitation(invitationId: string): Observable<Invitation> {
    const inv = MOCK_INVITATIONS.find(i => i.id === invitationId) ?? MOCK_INVITATIONS[0];
    return of({ ...inv, status: 'ACCEPTED' as const }).pipe(delay(400));
  }

  /** TODO: PATCH /api/invitations/{invitationId}/reject */
  rejectInvitation(invitationId: string): Observable<Invitation> {
    const inv = MOCK_INVITATIONS.find(i => i.id === invitationId) ?? MOCK_INVITATIONS[0];
    return of({ ...inv, status: 'REJECTED' as const }).pipe(delay(400));
  }
}
