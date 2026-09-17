import type { ReactElement } from 'react';
import { TicketCard } from './TicketCard.tsx';
import { useTicketQueue } from './useTicketQueue.ts';
import type { TicketApi, TicketFilter } from './types.ts';

const FILTERS: { value: TicketFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'assigned', label: 'В работе' },
  { value: 'done', label: 'Готово' },
  { value: 'cancelled', label: 'Отменённые' },
];

export function TicketQueue({ api }: { api: TicketApi }): ReactElement {
  const queue = useTicketQueue(api);

  return (
    <section aria-label="Очередь заявок">
      <h2>Очередь заявок</h2>

      <div role="tablist" aria-label="Фильтр по статусу">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={queue.filter === item.value}
            onClick={() => queue.setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {queue.status === 'loading' ? <p role="status">Загрузка…</p> : null}

      {queue.status === 'error' ? <p role="alert">{queue.errorMessage}</p> : null}

      {queue.actionError ? <p role="alert">{queue.actionError}</p> : null}

      {queue.status === 'ready' && queue.visibleTickets.length === 0 ? (
        <p>Заявок нет</p>
      ) : null}

      {queue.status === 'ready' && queue.visibleTickets.length > 0 ? (
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
      ) : null}
    </section>
  );
}
