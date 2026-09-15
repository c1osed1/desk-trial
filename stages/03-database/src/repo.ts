import type { Pool, PoolClient } from 'pg';
import { RepoError } from './errors.ts';
import type { TicketRow } from './types.ts';

export class PgTicketRepo {
  constructor(private readonly pool: Pool) {}

  async listInbox(): Promise<TicketRow[]> {
    const { rows } = await this.pool.query<TicketRow>(
      `SELECT * FROM tickets
        WHERE status IN ('open', 'assigned')
        ORDER BY priority ASC, created_at ASC`,
    );
    return rows;
  }

  async assign(ticketId: string, staffId: string): Promise<TicketRow> {
    return this.inTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [staffId]);

      const found = await client.query<TicketRow>(
        'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
        [ticketId],
      );
      if (found.rowCount === 0) throw new RepoError('not_found', 'ticket not found');
      if (found.rows[0].status !== 'open') {
        throw new RepoError('conflict', `ticket is already ${found.rows[0].status}`);
      }

      const busy = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM tickets
          WHERE assignee_id = $1 AND status = 'assigned'`,
        [staffId],
      );
      if (busy.rows[0].count > 0) {
        throw new RepoError('conflict', 'staff already has a ticket in progress');
      }

      const updated = await client.query<TicketRow>(
        `UPDATE tickets
            SET status = 'assigned', assignee_id = $2, updated_at = now()
          WHERE id = $1 AND status = 'open'
        RETURNING *`,
        [ticketId, staffId],
      );
      if (updated.rowCount === 0) throw new RepoError('conflict', 'ticket was taken');

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'assigned', $2)`,
        [ticketId, staffId],
      );

      return updated.rows[0];
    });
  }

  async complete(ticketId: string, staffId: string): Promise<TicketRow> {
    return this.inTransaction(async (client) => {
      const found = await client.query<TicketRow>(
        'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
        [ticketId],
      );
      if (found.rowCount === 0) throw new RepoError('not_found', 'ticket not found');

      const ticket = found.rows[0];
      if (ticket.status !== 'assigned') {
        throw new RepoError('conflict', `ticket is ${ticket.status}, not in progress`);
      }
      if (ticket.assignee_id !== staffId) {
        throw new RepoError('forbidden', 'ticket belongs to another staff member');
      }

      const updated = await client.query<TicketRow>(
        `UPDATE tickets SET status = 'done', updated_at = now()
          WHERE id = $1 AND status = 'assigned' AND assignee_id = $2
        RETURNING *`,
        [ticketId, staffId],
      );
      if (updated.rowCount === 0) throw new RepoError('conflict', 'ticket changed');

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'completed', $2)`,
        [ticketId, staffId],
      );

      return updated.rows[0];
    });
  }

  async workload(staffId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM tickets
        WHERE assignee_id = $1 AND status = 'assigned'`,
      [staffId],
    );
    return rows[0].count;
  }

  private async inTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
