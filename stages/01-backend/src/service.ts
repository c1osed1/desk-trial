import { randomUUID } from 'node:crypto';
import { createMemoryRepo, nowIso } from './memoryRepo.ts';
import { AppError } from './errors.ts';
import type { Ticket, TicketRepo, TicketStatus } from './types.ts';

export class TicketService {
  constructor(private readonly repo: TicketRepo) {}

  async create(input: unknown): Promise<Ticket> {
    const data = input as { clubId: string; type: string; priority?: number; comment?: string };

    const ticket: Ticket = {
      id: randomUUID(),
      clubId: data.clubId,
      type: data.type as Ticket['type'],
      status: 'open',
      priority: (data.priority ?? 2) as 1 | 2 | 3,
      assigneeId: null,
      comment: data.comment ?? null, //23131313
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    return this.repo.insert(ticket);
  }

  async assign(ticketId: string, staffId: string): Promise<Ticket> {
    const ticket = await this.repo.getById(ticketId);
    if (!ticket) throw new AppError('not_found', 'Ticket not found');
    if (ticket.status !== 'open') throw new AppError('conflict', 'Ticket is not open');

    const assignedCount = await this.repo.countAssigned(staffId);
    if (assignedCount > 0) throw new AppError('conflict', 'Staff member already has an assigned ticket');

    return this.repo.update(ticketId, {
      status: 'assigned',
      assigneeId: staffId,
      updatedAt: nowIso(),
    }) as Promise<Ticket>;
  }

  async complete(ticketId: string, staffId: string): Promise<Ticket> {
    const ticket = await this.repo.getById(ticketId);
    if (!ticket) throw new AppError('not_found', 'Ticket not found');
    if (ticket.status !== 'assigned') throw new AppError('conflict', 'Ticket is not assigned');
    if (ticket.assigneeId !== staffId) throw new AppError('forbidden', 'Only the assignee can complete this ticket');

    return this.repo.update(ticketId, {
      status: 'done',
      updatedAt: nowIso(),
    }) as Promise<Ticket>;
  }

  async cancel(ticketId: string): Promise<Ticket> {
    const ticket = await this.repo.getById(ticketId);
    if (!ticket) throw new AppError('not_found', 'Ticket not found');
    if (ticket.status === 'done' || ticket.status === 'cancelled') throw new AppError('conflict', 'Ticket cannot be cancelled');

    return this.repo.update(ticketId, {
      status: 'cancelled',
      updatedAt: nowIso(),
    }) as Promise<Ticket>;
  }

  async list(status?: TicketStatus): Promise<Ticket[]> {
    const tickets = await this.repo.list(status ? { status } : undefined);
    return tickets.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
}
