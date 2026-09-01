import { useState } from 'react';
import type { Ticket, TicketApi, TicketFilter } from './types.ts';

export type TicketQueueState = {
  status: 'loading' | 'ready' | 'error';
  tickets: Ticket[];
  visibleTickets: Ticket[];
  filter: TicketFilter;
  errorMessage: string | null;
  actionError: string | null;
  assigningId: string | null;
  setFilter: (filter: TicketFilter) => void;
  assign: (ticketId: string) => Promise<void>;
};

/** TODO */
export function useTicketQueue(_api: TicketApi): TicketQueueState {
  void useState;
  throw new Error('TODO: implement useTicketQueue');
}
