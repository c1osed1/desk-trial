export const TICKET_TYPES = ['pc_request', 'sms_code', 'balance'] as const;
export const TICKET_STATUSES = ['open', 'assigned', 'done', 'cancelled'] as const;

export type TicketType = (typeof TICKET_TYPES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type Ticket = {
  id: string;
  clubId: string;
  type: TicketType;
  status: TicketStatus;
  priority: 1 | 2 | 3;
  assigneeId: string | null;
  comment: string | null;
};

export type TicketFilter = 'all' | TicketStatus;

export type TicketApi = {
  list(): Promise<Ticket[]>;
  assign(ticketId: string): Promise<Ticket>;
};
