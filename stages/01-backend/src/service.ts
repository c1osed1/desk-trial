import { randomUUID } from 'node:crypto';
import { AppError } from './errors.ts';
import { nowIso } from './memoryRepo.ts';
import { createTicketSchema } from './schema.ts';
import type { Ticket, TicketRepo, TicketStatus } from './types.ts';

export class TicketService {
  constructor(private readonly repo: TicketRepo) {}

  async create(input: unknown): Promise<Ticket> {
    const parsed = createTicketSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError('validation', 'invalid ticket payload');
    }

    const now = nowIso();

    return this.repo.insert({
      id: randomUUID(),
      clubId: parsed.data.clubId,
      type: parsed.data.type,
      status: 'open',
      priority: (parsed.data.priority ?? 2) as Ticket['priority'],
      assigneeId: null,
      comment: parsed.data.comment ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async assign(ticketId: string, staffId: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(ticketId);

    if (ticket.status !== 'open') {
      throw new AppError('conflict', `ticket is already ${ticket.status}`);
    }

    if ((await this.repo.countAssigned(staffId)) > 0) {
      throw new AppError('conflict', 'staff already has a ticket in progress');
    }

    const updated = await this.repo.update(ticketId, {
      status: 'assigned',
      assigneeId: staffId,
      updatedAt: nowIso(),
    });

    if (!updated) throw new AppError('not_found', 'ticket not found');
    return updated;
  }

  async complete(ticketId: string, staffId: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(ticketId);

    if (ticket.status !== 'assigned') {
      throw new AppError('conflict', `ticket is ${ticket.status}, not in progress`);
    }

    if (ticket.assigneeId !== staffId) {
      throw new AppError('forbidden', 'ticket belongs to another staff member');
    }

    const updated = await this.repo.update(ticketId, {
      status: 'done',
      updatedAt: nowIso(),
    });

    if (!updated) throw new AppError('not_found', 'ticket not found');
    return updated;
  }

  async cancel(ticketId: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(ticketId);

    if (ticket.status === 'done' || ticket.status === 'cancelled') {
      throw new AppError('conflict', `ticket is already ${ticket.status}`);
    }

    const updated = await this.repo.update(ticketId, {
      status: 'cancelled',
      updatedAt: nowIso(),
    });

    if (!updated) throw new AppError('not_found', 'ticket not found');
    return updated;
  }

  async list(status?: TicketStatus): Promise<Ticket[]> {
    const tickets = await this.repo.list(status ? { status } : undefined);

    return tickets.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });
  }

  private async getOrThrow(ticketId: string): Promise<Ticket> {
    const ticket = await this.repo.getById(ticketId);
    if (!ticket) throw new AppError('not_found', 'ticket not found');
    return ticket;
  }
}
