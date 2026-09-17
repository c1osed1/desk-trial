import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export const LOAD_ERROR_FALLBACK = 'Не удалось загрузить очередь';
export const ACTION_ERROR_FALLBACK = 'Не удалось взять заявку';

/**
 * Only a real `Error` carries a message worth showing. Anything else can be
 * thrown — a string, a bare object, `undefined` — and none of that is text a
 * user should read, so the caller passes a phrase that fits the failed action.
 */
function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  return fallback;
}

export function useTicketQueue(api: TicketApi): TicketQueueState {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const apiRef = useRef(api);
  apiRef.current = api;
  const inFlight = useRef(false);

  // The queue is fetched once. Switching a filter must never hit the network again.
  useEffect(() => {
    let active = true;
    setStatus('loading');
    setErrorMessage(null);

    void (async () => {
      try {
        const loaded = await apiRef.current.list();
        if (!active) return;
        setTickets(Array.isArray(loaded) ? loaded : []);
        setStatus('ready');
      } catch (error) {
        if (!active) return;
        setErrorMessage(describeError(error, LOAD_ERROR_FALLBACK));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const assign = useCallback(async (ticketId: string) => {
    // one request at a time: a second click while the first is running is ignored
    if (inFlight.current) return;
    inFlight.current = true;
    setAssigningId(ticketId);
    setActionError(null);

    try {
      const updated = await apiRef.current.assign(ticketId);
      // A successful take means the ticket is in progress from now on. Trust the
      // response when it really is a ticket, otherwise fall back to that status so
      // the queue cannot get stuck showing a ticket that was already taken.
      const patch =
        updated && typeof updated === 'object' && typeof updated.id === 'string'
          ? updated
          : { status: 'assigned' as const };

      setTickets((current) =>
        current.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch } : ticket)),
      );
    } catch (error) {
      setActionError(describeError(error, ACTION_ERROR_FALLBACK));
    } finally {
      inFlight.current = false;
      setAssigningId(null);
    }
  }, []);

  // filtering is client side on purpose: switching a filter must not refetch
  const visibleTickets = useMemo(
    () => (filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter)),
    [filter, tickets],
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
