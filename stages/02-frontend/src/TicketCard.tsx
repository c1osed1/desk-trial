import type { ReactElement } from 'react';
import type { Ticket } from './types.ts';

type Props = {
  ticket: Ticket;
  assigning?: boolean;
  onAssign?: (ticketId: string) => void;
};

/** TODO */
export function TicketCard(_props: Props): ReactElement {
  throw new Error('TODO: implement TicketCard');
}
