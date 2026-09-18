import type { Pool } from 'pg';
import type { TicketRow } from './types.ts';
import { RepoError } from './errors.ts';

export class PgTicketRepo {
  constructor(private readonly pool: Pool) {}

  async listInbox(): Promise<TicketRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, club_id, type, status, priority, assignee_id, comment, created_at, updated_at
         FROM tickets
        WHERE status IN ('open', 'assigned')
        ORDER BY priority ASC, created_at ASC`,
    );
    return rows;
  }

  async assign(ticketId: string, staffId: string): Promise<TicketRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [staffId]);

      const { rows: workload } = await client.query<{ count: string }>(
        `SELECT count(*) AS count
           FROM tickets
          WHERE assignee_id = $1 AND status = 'assigned'`,
        [staffId],
      );
      if (Number(workload[0]?.count ?? 0) > 0) {
        throw new RepoError('conflict', 'Staff member already has an assigned ticket');
      }

      const { rows } = await client.query<TicketRow>(
        `UPDATE tickets
            SET status = 'assigned', assignee_id = $2, updated_at = now()
          WHERE id = $1 AND status = 'open'
          RETURNING id, club_id, type, status, priority, assignee_id, comment, created_at, updated_at`,
        [ticketId, staffId],
      );

      if (rows.length === 0) {
        const { rows: existing } = await client.query<{ id: string }>(
          'SELECT id FROM tickets WHERE id = $1',
          [ticketId],
        );
        if (existing.length === 0) throw new RepoError('not_found', 'Ticket not found');
        throw new RepoError('conflict', 'Ticket can no longer be assigned');
      }

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'assigned', $2)`,
        [ticketId, staffId],
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async complete(ticketId: string, staffId: string): Promise<TicketRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<TicketRow>(
        `UPDATE tickets
            SET status = 'done', updated_at = now()
          WHERE id = $1 AND assignee_id = $2 AND status = 'assigned'
          RETURNING id, club_id, type, status, priority, assignee_id, comment, created_at, updated_at`,
        [ticketId, staffId],
      );

      if (rows.length === 0) {
        const { rows: existing } = await client.query<TicketRow>(
          `SELECT id, status, assignee_id
             FROM tickets
            WHERE id = $1`,
          [ticketId],
        );
        if (existing.length === 0) throw new RepoError('not_found', 'Ticket not found');
        const found = existing[0];
        if (found.status !== 'assigned') throw new RepoError('conflict', 'Ticket is not assigned');
        throw new RepoError('forbidden', 'Only the assignee can complete this ticket');
      }

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'completed', $2)`,
        [ticketId, staffId],
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async workload(staffId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT count(*) AS count
         FROM tickets
        WHERE assignee_id = $1 AND status = 'assigned'`,
      [staffId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}