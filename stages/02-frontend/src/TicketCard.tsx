import type { ReactElement } from 'react';
import { priorityLabel, ticketTypeLabel } from './formatTicket.ts';
import type { Ticket } from './types.ts';

type Props = {
  ticket: Ticket;
  assigning?: boolean;
  onAssign?: (ticketId: string) => void;
};

export function TicketCard({ ticket, assigning = false, onAssign }: Props): ReactElement {
  const label = `${ticketTypeLabel(ticket.type)}: ${priorityLabel(ticket.priority)}`;
  const canAssign = ticket.status === 'open';

  return (
    <article aria-label={label}>
      {ticket.comment != null && ticket.comment !== '' && <p>{ticket.comment}</p>}
      {canAssign && (
        <button type="button" disabled={assigning} onClick={() => onAssign?.(ticket.id)}>
          {assigning ? 'Берём…' : 'Взять'}
        </button>
      )}
    </article>
  );
}