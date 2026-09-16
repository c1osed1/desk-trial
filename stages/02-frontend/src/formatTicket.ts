import type { TicketType } from './types.ts';

export function ticketTypeLabel(type: TicketType): string {
  switch (type) {
    case 'pc_request':
      return 'ПК';
    case 'sms_code':
      return 'SMS-код';
    case 'balance':
      return 'Баланс';
  }
}

export function priorityLabel(priority: 1 | 2 | 3): string {
  switch (priority) {
    case 1:
      return 'срочно';
    case 2:
      return 'обычно';
    case 3:
      return 'низкий';
  }
}