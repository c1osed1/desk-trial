import type { Ticket, TicketRepo, TicketStatus } from './types.ts';

/** TODO */
export class TicketService {
  constructor(private readonly repo: TicketRepo) {
    void this.repo;
  }

  async create(_input: unknown): Promise<Ticket> {
    throw new Error('TODO: implement TicketService.create');
  }

  async assign(_ticketId: string, _staffId: string): Promise<Ticket> {
    throw new Error('TODO: implement TicketService.assign');
  }

  async complete(_ticketId: string, _staffId: string): Promise<Ticket> {
    throw new Error('TODO: implement TicketService.complete');
  }

  async cancel(_ticketId: string): Promise<Ticket> {
    throw new Error('TODO: implement TicketService.cancel');
  }

  async list(_status?: TicketStatus): Promise<Ticket[]> {
    throw new Error('TODO: implement TicketService.list');
  }
}
