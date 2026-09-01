export const TICKET_TYPES = ['pc_request', 'sms_code', 'balance'] as const;
export const TICKET_STATUSES = ['open', 'assigned', 'done', 'cancelled'] as const;

export type TicketType = (typeof TICKET_TYPES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type TicketRow = {
  id: string;
  club_id: string;
  type: TicketType;
  status: TicketStatus;
  priority: number;
  assignee_id: string | null;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
};
