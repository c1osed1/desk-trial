import type { TicketType } from './types.ts';

const TYPE_LABELS: Record<TicketType, string> = {
  pc_request: 'ПК',
  sms_code: 'SMS-код',
  balance: 'Баланс',
};

const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'срочно',
  2: 'обычно',
  3: 'низкий',
};

export function ticketTypeLabel(type: TicketType): string {
  return TYPE_LABELS[type] ?? String(type);
}

export function priorityLabel(priority: 1 | 2 | 3): string {
  return PRIORITY_LABELS[priority] ?? PRIORITY_LABELS[2];
}
