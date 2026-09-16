import type { ReactElement } from 'react';
import { TicketCard } from './TicketCard.tsx';
import type { TicketApi, TicketFilter } from './types.ts';
import { useTicketQueue } from './useTicketQueue.ts';

const FILTERS: Array<{ value: TicketFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'assigned', label: 'В работе' },
  { value: 'done', label: 'Готово' },
  { value: 'cancelled', label: 'Отменённые' },
];

export function TicketQueue({ api }: { api: TicketApi }): ReactElement {
  const queue = useTicketQueue(api);

  if (queue.status === 'loading') {
    return <p role="status">Загрузка...</p>;
  }

  if (queue.status === 'error') {
    return <p role="alert">{queue.errorMessage}</p>;
  }

  return (
    <section>
      <div role="tablist" aria-label="Фильтр заявок">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={queue.filter === value}
            onClick={() => queue.setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {queue.actionError != null && <p role="alert">{queue.actionError}</p>}
      {queue.visibleTickets.length === 0 ? (
        <div>Нет заявок</div>
      ) : (
        <ul>
          {queue.visibleTickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard
                ticket={ticket}
                assigning={queue.assigningId === ticket.id}
                onAssign={queue.assign}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}