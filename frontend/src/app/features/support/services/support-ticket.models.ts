export type TicketCategory = 'BUS' | 'HOTEL' | 'ACTIVITY' | 'PLATFORM' | 'OTHER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketReply {
  id: string;
  message: string;
  senderName: string | null;
  senderRole: string | null;
  createdAt: string;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  assignedProviderId: number | null;
  assignedProviderName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  replies: TicketReply[];
}

export interface CreateTicketPayload {
  category: TicketCategory;
  subject: string;
  description: string;
  assignedProviderId?: number | null;
}

export interface Provider {
  id: number;
  businessName: string;
  type: string;
}
