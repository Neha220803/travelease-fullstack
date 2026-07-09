export type TicketCategory = 'BUS' | 'HOTEL' | 'ACTIVITY' | 'TRIP' | 'OTHER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketReply {
  replyId: string;
  message: string;
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
}
