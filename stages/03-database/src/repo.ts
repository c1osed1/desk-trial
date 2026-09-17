import type { Pool, PoolClient } from 'pg';
import { RepoError } from './errors.ts';
import type { TicketRow } from './types.ts';

const INBOX_STATUSES = ['open', 'assigned'];

/** `uuid` columns reject anything that is not a uuid representation. */
const INVALID_TEXT_REPRESENTATION = '22P02';

function translateError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === INVALID_TEXT_REPRESENTATION
  ) {
    // an id that is not a uuid cannot match any row, so it is simply unknown
    return new RepoError('not_found', 'unknown ticket or staff member');
  }
  return error;
}

export class PgTicketRepo {
  constructor(private readonly pool: Pool) {}

  /** Open + in-progress tickets: hotter first, FIFO inside the same priority. */
  async listInbox(): Promise<TicketRow[]> {
    const result = await this.pool.query<TicketRow>(
      `SELECT *
         FROM tickets
        WHERE status = ANY($1::text[])
        ORDER BY priority ASC, created_at ASC`,
      [INBOX_STATUSES],
    );
    return result.rows;
  }

  /**
   * Takes a ticket for a staff member.
   *
   * Everything happens in one transaction so that neither rule can be broken by
   * a concurrent request:
   *   1. a staff member never holds two tickets at once;
   *   2. one ticket never goes to two staff members.
   *
   * (2) is enforced by the `SELECT … FOR UPDATE` on the ticket row, (1) needs a
   * lock that is not tied to a ticket row, so a transaction-scoped advisory lock
   * keyed by the staff member serialises all of their assigns.
   */
  async assign(ticketId: string, staffId: string): Promise<TicketRow> {
    return this.inTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [staffId]);

      const locked = await client.query<TicketRow>('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [
        ticketId,
      ]);
      const ticket = locked.rows[0];
      if (!ticket) {
        throw new RepoError('not_found', 'ticket not found');
      }
      if (ticket.status !== 'open') {
        throw new RepoError('conflict', 'ticket is not open');
      }

      const busy = await client.query(
        `SELECT 1 FROM tickets WHERE assignee_id = $1 AND status = 'assigned' LIMIT 1`,
        [staffId],
      );
      if (busy.rowCount) {
        throw new RepoError('conflict', 'staff member already has a ticket in progress');
      }

      const updated = await client.query<TicketRow>(
        `UPDATE tickets
            SET status = 'assigned', assignee_id = $2, updated_at = now()
          WHERE id = $1 AND status = 'open'
      RETURNING *`,
        [ticketId, staffId],
      );
      const row = updated.rows[0];
      if (!row) {
        throw new RepoError('conflict', 'ticket was taken by someone else');
      }

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'assigned', $2)`,
        [ticketId, staffId],
      );

      return row;
    });
  }

  /** Only the staff member who took the ticket may finish it. */
  async complete(ticketId: string, staffId: string): Promise<TicketRow> {
    return this.inTransaction(async (client) => {
      const locked = await client.query<TicketRow>('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [
        ticketId,
      ]);
      const ticket = locked.rows[0];
      if (!ticket) {
        throw new RepoError('not_found', 'ticket not found');
      }
      if (ticket.status !== 'assigned') {
        throw new RepoError('conflict', 'ticket is not in progress');
      }
      if (ticket.assignee_id !== staffId) {
        throw new RepoError('forbidden', 'ticket was taken by another staff member');
      }

      const updated = await client.query<TicketRow>(
        `UPDATE tickets SET status = 'done', updated_at = now() WHERE id = $1 RETURNING *`,
        [ticketId],
      );

      await client.query(
        `INSERT INTO ticket_events (ticket_id, kind, actor_id) VALUES ($1, 'completed', $2)`,
        [ticketId, staffId],
      );

      return updated.rows[0];
    });
  }

  async workload(staffId: string): Promise<number> {
    const result = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM tickets
        WHERE assignee_id = $1 AND status = 'assigned'`,
      [staffId],
    );
    return result.rows[0]?.count ?? 0;
  }

  private async inTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw translateError(error);
    } finally {
      client.release();
    }
  }
}
