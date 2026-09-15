import { useEffect, useState } from 'react';
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

export function useTicketQueue(api: TicketApi): TicketQueueState {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    api.list().then(
      (list) => {
        setTickets(list);
        setStatus('ready');
      },
      (error: unknown) => {
        setErrorMessage(toMessage(error, 'Не удалось загрузить заявки'));
        setStatus('error');
      },
    );
  }, [api]);

  const visibleTickets =
    filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter);

  async function assign(ticketId: string): Promise<void> {
    setActionError(null);
    setAssigningId(ticketId);

    try {
      const updated = await api.assign(ticketId);
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
    } catch (error: unknown) {
      setActionError(toMessage(error, 'Не удалось взять заявку'));
    } finally {
      setAssigningId(null);
    }
  }

  return {
    status,
    tickets,
    visibleTickets,
    filter,
    errorMessage,
    actionError,
    assigningId,
    setFilter,
    assign,
  };
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}
