-- Additive migration: preserve all users, destinations and saved trips.
ALTER TABLE travellant.user_preferences ADD COLUMN IF NOT EXISTS planning_details JSON;
ALTER TABLE travellant.destination_embeddings ADD COLUMN IF NOT EXISTS model_revision VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_itin_destination ON travellant.itineraries(destination_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON travellant.refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS travellant.planning_requests (
    user_id INTEGER NOT NULL REFERENCES travellant.users(id) ON DELETE CASCADE,
    request_key VARCHAR(64) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    request_payload JSON NOT NULL,
    status VARCHAR(20) NOT NULL,
    phase VARCHAR(30) NOT NULL,
    itinerary_id INTEGER REFERENCES travellant.itineraries(id) ON DELETE SET NULL,
    error VARCHAR(500),
    error_code INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    PRIMARY KEY(user_id, request_key),
    CONSTRAINT ck_planning_status CHECK(status IN ('pending','running','complete','failed','cancelled'))
);
CREATE INDEX IF NOT EXISTS ix_planning_requests_itinerary_id ON travellant.planning_requests(itinerary_id);
CREATE INDEX IF NOT EXISTS ix_planning_requests_completed_at ON travellant.planning_requests(completed_at);
ALTER TABLE travellant.planning_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE travellant.planning_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE travellant.planning_requests TO travellant_app;
CREATE POLICY backend_access ON travellant.planning_requests FOR ALL TO travellant_app USING(true) WITH CHECK(true);
