/**
 * The database schema, as numbered steps. A step, once applied anywhere, is
 * never edited: add a new one instead. Kept in TypeScript so the build ships
 * them without copying SQL files.
 */
export interface Migration {
  id: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: '001_mobile_mvp',
    sql: /* sql */ `
      -- An agent's signed-in session. Tokens are stored only as SHA-256
      -- hashes, so a database leak doesn't leak working tokens.
      CREATE TABLE agent_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id text NOT NULL,
        agent_code text,
        agent_name text NOT NULL,
        agent_email text NOT NULL,
        agent_role text NOT NULL,
        organization text,
        access_token_hash text NOT NULL UNIQUE,
        access_expires_at timestamptz NOT NULL,
        refresh_token_hash text NOT NULL UNIQUE,
        -- CHL's own session for this agent, when CHL issues one.
        -- TODO(security): encrypt at rest once a key service is chosen.
        chl_access_token text,
        chl_refresh_token text,
        device jsonb,
        ip text,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        revoked_at timestamptz,
        revoked_reason text
      );
      CREATE INDEX agent_sessions_agent_idx ON agent_sessions (agent_id);

      -- Every verification attempt, successful or not (SRD §28 audit trail).
      CREATE TABLE verifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reference text NOT NULL UNIQUE,
        agent_id text NOT NULL,
        agent_code text,
        agent_name text NOT NULL,
        organization text,
        session_id uuid REFERENCES agent_sessions (id),
        method text NOT NULL CHECK (method IN ('plate', 'qrCode', 'eTag', 'rfid')),
        -- The plate, QR reference or tag reference processed. Never sent to
        -- the app (SRD §9.4: raw RFID values stay hidden).
        processed_identifier text NOT NULL,
        outcome text NOT NULL
          CHECK (outcome IN ('found', 'vehicleNotFound', 'unknownTag', 'unavailable')),
        plate text,
        vehicle_id text,
        vehicle_type text,
        etag_status text,
        trip_status text,
        trip_reference text,
        chl_reference text,
        -- What the app is shown: vehicle, E-Tag and trip.
        result jsonb,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        accuracy_metres double precision,
        enforcement_point text,
        device jsonb,
        sync_status text NOT NULL DEFAULT 'live' CHECK (sync_status IN ('live', 'offline')),
        idempotency_key text,
        load_status text CHECK (load_status IN ('loaded', 'empty')),
        load_status_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (agent_id, idempotency_key)
      );
      CREATE INDEX verifications_agent_created_idx
        ON verifications (agent_id, created_at DESC, id DESC);

      -- Locations sent for a trip's destination check (SRD §14.2).
      CREATE TABLE destination_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        verification_id uuid NOT NULL REFERENCES verifications (id) ON DELETE CASCADE,
        transaction_reference text NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        accuracy_metres double precision,
        completion_decision text,
        recorded_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX destination_locations_verification_idx
        ON destination_locations (verification_id);

      -- An agent's notifications inbox.
      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id text NOT NULL,
        category text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        read_at timestamptz
      );
      CREATE INDEX notifications_agent_created_idx
        ON notifications (agent_id, created_at DESC, id DESC);

      -- Sign-ins, sign-outs and other account events, for administrators.
      CREATE TABLE audit_events (
        id bigserial PRIMARY KEY,
        agent_id text,
        action text NOT NULL,
        outcome text NOT NULL,
        details jsonb,
        ip text,
        request_id text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX audit_events_agent_created_idx ON audit_events (agent_id, created_at DESC);
    `,
  },
];
