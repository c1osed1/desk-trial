import type { ReactElement } from 'react';
import { TicketCard } from './TicketCard.tsx';
import { useTicketQueue } from './useTicketQueue.ts';
import type { TicketApi, TicketFilter } from './types.ts';

const FILTERS: { value: TicketFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'assigned', label: 'В работе' },
  { value: 'done', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
];

export function TicketQueue({ api }: { api: TicketApi }): ReactElement {
  const queue = useTicketQueue(api);

  if (queue.status === 'loading') {
    return <p role="status">Загрузка…</p>;
  }

  if (queue.status === 'error') {
    return <p role="alert">{queue.errorMessage ?? 'Не удалось загрузить заявки'}</p>;
  }

  return (
    <section aria-label="Очередь заявок">
      <div role="group" aria-label="Фильтр по статусу">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={queue.filter === item.value}
            onClick={() => queue.setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {queue.actionError ? <p role="alert">{queue.actionError}</p> : null}

      {queue.visibleTickets.length === 0 ? (
        <p role="status">Заявок нет</p>
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
