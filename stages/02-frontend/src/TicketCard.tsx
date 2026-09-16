import type { ReactElement } from 'react';
import { priorityLabel, ticketTypeLabel } from './formatTicket.ts';
import type { Ticket } from './types.ts';

type Props = {
  ticket: Ticket;
  assigning?: boolean;
  onAssign?: (ticketId: string) => void;
};

export function TicketCard({ ticket, assigning = false, onAssign }: Props): ReactElement {
  const typeLabel = ticketTypeLabel(ticket.type);
  const priority = priorityLabel(ticket.priority);

  return (
    <article aria-label={`${typeLabel}: ${priority}`}>
      <h3>{typeLabel}</h3>
      <p>Приоритет: {priority}</p>
      {ticket.comment ? <p>{ticket.comment}</p> : null}

      {ticket.status === 'open' ? (
        <button
          type="button"
          disabled={assigning}
          onClick={() => onAssign?.(ticket.id)}
        >
          Взять
        </button>
      ) : null}
    </article>
  );
}
