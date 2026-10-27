-- HUMI application tables (separate from n8n's internal tables in the same database).
-- Runs automatically only when the Postgres volume is initialized from empty.

-- Mirror of the Perfume sheet tab. Knowledge Feeder upserts it on every catalog change;
-- Admin Console's !stock and !harga update a row by SKU and set updated_at.
CREATE TABLE IF NOT EXISTS products (
    sku         VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255),
    price       INTEGER,
    web_stock   VARCHAR(100),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Used by the Customer Agent's Postgres Chat Memory node (table name humi_chat_memory).
-- n8n creates id/session_id/message itself if the table is missing; creating it here
-- adds created_at so !log can report daily/weekly counts. The node only inserts
-- session_id and message, so the default fills created_at.
CREATE TABLE IF NOT EXISTS humi_chat_memory (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(255) NOT NULL,
    message     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS humi_chat_memory_created_at_idx ON humi_chat_memory (created_at);
