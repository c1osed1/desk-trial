import type { Ticket } from './types.ts';

export function ticketFixture(over: Partial<Ticket> = {}): Ticket {
  return {
    id: over.id ?? 'ticket-1',
    clubId: over.clubId ?? 'club-1',
    type: over.type ?? 'pc_request',
    status: over.status ?? 'open',
    priority: over.priority ?? 2,
    assigneeId: over.assigneeId ?? null,
    comment: over.comment ?? null,
  };
}
