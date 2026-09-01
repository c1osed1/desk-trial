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
  createdAt: string;
  updatedAt: string;
};

export type TicketRepo = {
  insert(ticket: Ticket): Promise<Ticket>;
  getById(id: string): Promise<Ticket | null>;
  update(id: string, patch: Partial<Omit<Ticket, 'id' | 'createdAt'>>): Promise<Ticket | null>;
  list(filter?: { status?: TicketStatus }): Promise<Ticket[]>;
  countAssigned(staffId: string): Promise<number>;
};
