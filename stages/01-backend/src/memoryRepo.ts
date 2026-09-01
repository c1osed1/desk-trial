import { randomUUID } from 'node:crypto';
import type { Ticket, TicketRepo, TicketStatus } from './types.ts';

export function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryRepo(seed: Ticket[] = []): TicketRepo {
  const tickets = new Map<string, Ticket>(seed.map((t) => [t.id, { ...t }]));

  return {
    async insert(ticket) {
      const copy = { ...ticket };
      tickets.set(copy.id, copy);
      return { ...copy };
    },
    async getById(id) {
      const found = tickets.get(id);
      return found ? { ...found } : null;
    },
    async update(id, patch) {
      const current = tickets.get(id);
      if (!current) return null;
      const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt };
      tickets.set(id, next);
      return { ...next };
    },
    async list(filter) {
      const all = [...tickets.values()];
      const filtered = filter?.status ? all.filter((t) => t.status === filter.status) : all;
      return filtered.map((t) => ({ ...t }));
    },
    async countAssigned(staffId) {
      return [...tickets.values()].filter((t) => t.status === 'assigned' && t.assigneeId === staffId)
        .length;
    },
  };
}

export function ticketFixture(over: Partial<Ticket> = {}): Ticket {
  const ts = over.createdAt ?? nowIso();
  return {
    id: over.id ?? randomUUID(),
    clubId: over.clubId ?? '11111111-1111-4111-8111-111111111111',
    type: over.type ?? 'pc_request',
    status: over.status ?? 'open',
    priority: over.priority ?? 2,
    assigneeId: over.assigneeId ?? null,
    comment: over.comment ?? null,
    createdAt: ts,
    updatedAt: over.updatedAt ?? ts,
  };
}

export function isTicketStatus(value: string): value is TicketStatus {
  return value === 'open' || value === 'assigned' || value === 'done' || value === 'cancelled';
}
