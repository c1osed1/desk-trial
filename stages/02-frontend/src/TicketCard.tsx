import type { ReactElement } from 'react';
import { priorityLabel, ticketStatusLabel, ticketTypeLabel } from './formatTicket.ts';
import type { Ticket } from './types.ts';

type Props = {
  ticket: Ticket;
  assigning?: boolean;
  onAssign?: (ticketId: string) => void;
};

export function TicketCard({ ticket, assigning = false, onAssign }: Props): ReactElement {
  const title = `${ticketTypeLabel(ticket.type)}: ${priorityLabel(ticket.priority)}`;

  return (
    <article aria-label={title}>
      <h3>{title}</h3>
      <dl>
        <dt>Тип</dt>
        <dd>{ticketTypeLabel(ticket.type)}</dd>
        <dt>Приоритет</dt>
        <dd>{priorityLabel(ticket.priority)}</dd>
        <dt>Статус</dt>
        <dd>{ticketStatusLabel(ticket.status)}</dd>
      </dl>

      {ticket.comment ? <p>{ticket.comment}</p> : null}

      {ticket.status === 'open' ? (
        <button
          type="button"
          disabled={assigning}
          aria-busy={assigning || undefined}
          onClick={() => onAssign?.(ticket.id)}
        >
          {assigning ? 'Берём…' : 'Взять'}
        </button>
      ) : null}
    </article>
  );
}
