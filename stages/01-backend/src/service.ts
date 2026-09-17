import { randomUUID } from 'node:crypto';
import { AppError } from './errors.ts';
import { nowIso } from './memoryRepo.ts';
import { createTicketSchema } from './schema.ts';
import type { Ticket, TicketRepo, TicketStatus } from './types.ts';
import { TICKET_STATUSES } from './types.ts';

const DEFAULT_PRIORITY: Ticket['priority'] = 2;

function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

function toPriority(value: number | undefined): Ticket['priority'] {
  return value === 1 || value === 2 || value === 3 ? value : DEFAULT_PRIORITY;
}

/** Surrounding whitespace is noise; a comment made of it only is no comment. */
function toComment(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function requireId(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError('validation', message);
  }
  return value;
}

/** Hotter first, then FIFO inside the same priority. */
function byHeatThenArrival(left: Ticket, right: Ticket): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  const leftAt = Date.parse(left.createdAt);
  const rightAt = Date.parse(right.createdAt);
  if (leftAt !== rightAt) return leftAt - rightAt;
  return 0;
}

export class TicketService {
  /** Serialises mutations so the in-memory repo cannot be raced by itself. */
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly repo: TicketRepo) {}

  async create(input: unknown): Promise<Ticket> {
    const parsed = createTicketSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError('validation', 'Invalid ticket payload');
    }

    const data = parsed.data;
    const timestamp = nowIso();

    return this.repo.insert({
      id: randomUUID(),
      clubId: data.clubId,
      type: data.type,
      status: 'open',
      priority: toPriority(data.priority),
      assigneeId: null,
      comment: toComment(data.comment),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async assign(ticketId: string, staffId: string): Promise<Ticket> {
    const staff = requireId(staffId, 'staffId is required');

    return this.exclusive(async () => {
      const ticket = await this.find(requireId(ticketId, 'ticketId is required'));

      if (ticket.status !== 'open') {
        throw new AppError('conflict', 'Ticket is not open anymore');
      }
      if ((await this.repo.countAssigned(staff)) > 0) {
        throw new AppError('conflict', 'Staff member already has a ticket in progress');
      }

      return this.patch(ticket.id, { status: 'assigned', assigneeId: staff });
    });
  }

  async complete(ticketId: string, staffId: string): Promise<Ticket> {
    const staff = requireId(staffId, 'staffId is required');

    return this.exclusive(async () => {
      const ticket = await this.find(requireId(ticketId, 'ticketId is required'));

      if (ticket.status !== 'assigned') {
        throw new AppError('conflict', 'Ticket is not in progress');
      }
      if (ticket.assigneeId !== staff) {
        throw new AppError('forbidden', 'Ticket was taken by another staff member');
      }

      return this.patch(ticket.id, { status: 'done' });
    });
  }

  async cancel(ticketId: string): Promise<Ticket> {
    return this.exclusive(async () => {
      const ticket = await this.find(requireId(ticketId, 'ticketId is required'));

      if (ticket.status === 'done' || ticket.status === 'cancelled') {
        throw new AppError('conflict', 'Ticket is already closed');
      }

      // A cancelled ticket is nobody's: releasing the assignee frees the staff
      // member for a new ticket, exactly like completing one would.
      return this.patch(ticket.id, { status: 'cancelled', assigneeId: null });
    });
  }

  async list(status?: TicketStatus): Promise<Ticket[]> {
    if (status !== undefined && !isTicketStatus(status)) {
      throw new AppError('validation', 'Unknown ticket status');
    }

    const tickets = await this.repo.list(status === undefined ? undefined : { status });
    return [...tickets].sort(byHeatThenArrival);
  }

  private async find(ticketId: string): Promise<Ticket> {
    const ticket = await this.repo.getById(ticketId);
    if (!ticket) {
      throw new AppError('not_found', 'Ticket not found');
    }
    return ticket;
  }

  private async patch(
    ticketId: string,
    changes: Partial<Omit<Ticket, 'id' | 'createdAt'>>,
  ): Promise<Ticket> {
    const updated = await this.repo.update(ticketId, { ...changes, updatedAt: nowIso() });
    if (!updated) {
      throw new AppError('not_found', 'Ticket not found');
    }
    return updated;
  }

  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous.catch(() => undefined);
    try {
      return await run();
    } finally {
      release();
    }
  }
}
