CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY,
  club_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('pc_request', 'sms_code', 'balance')),
  status text NOT NULL CHECK (status IN ('open', 'assigned', 'done', 'cancelled')),
  priority smallint NOT NULL CHECK (priority BETWEEN 1 AND 3),
  assignee_id uuid,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets (id),
  kind text NOT NULL CHECK (kind IN ('assigned', 'completed')),
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_inbox_idx ON tickets (priority, created_at) WHERE status IN ('open', 'assigned');
CREATE INDEX IF NOT EXISTS tickets_assignee_idx ON tickets (assignee_id) WHERE status = 'assigned';
