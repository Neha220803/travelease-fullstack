export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Invitation {
  id: string;
  tripId: string;
  tripName: string;
  tripDestination: string;
  tripStartDate: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  inviteeId?: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface CreateInvitationRequest {
  tripId: string;
  inviteeEmail: string;
}

export interface BulkInvitationRequest {
  tripId: string;
  inviteeEmails: string[];
}
