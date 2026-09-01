import type { Pool } from 'pg';
import type { TicketRow } from './types.ts';

/** TODO */
export class PgTicketRepo {
  constructor(private readonly pool: Pool) {
    void this.pool;
  }

  async listInbox(): Promise<TicketRow[]> {
    throw new Error('TODO: implement listInbox');
  }

  async assign(_ticketId: string, _staffId: string): Promise<TicketRow> {
    throw new Error('TODO: implement assign');
  }

  async complete(_ticketId: string, _staffId: string): Promise<TicketRow> {
    throw new Error('TODO: implement complete');
  }

  async workload(_staffId: string): Promise<number> {
    throw new Error('TODO: implement workload');
  }
}
