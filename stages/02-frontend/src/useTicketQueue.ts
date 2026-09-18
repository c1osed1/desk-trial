import { useCallback, useEffect, useMemo, useState } from 'react';
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
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    api.list()
      .then((list) => {
        if (cancelled) return;
        setTickets(list);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Не удалось загрузить очередь');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const visibleTickets = useMemo(() => {
    return filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const assign = useCallback(
    async (ticketId: string): Promise<void> => {
      if (assigningId != null) return;
      setAssigningId(ticketId);
      setActionError(null);
      try {
        const updated = await api.assign(ticketId);
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Не удалось взять заявку');
      } finally {
        setAssigningId(null);
      }
    },
    [api, assigningId],
  );

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