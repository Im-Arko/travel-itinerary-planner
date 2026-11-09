CREATE SCHEMA IF NOT EXISTS "travellant";

REVOKE ALL ON SCHEMA "travellant" FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'travellant_app') THEN
    CREATE ROLE travellant_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
END IF;
END $$;

CREATE TABLE travellant.destinations (
	id SERIAL NOT NULL,
	name VARCHAR(150) NOT NULL,
	country VARCHAR(100) NOT NULL,
	continent VARCHAR(50),
	description TEXT NOT NULL,
	climate_type VARCHAR(13) NOT NULL,
	destination_type VARCHAR(11) NOT NULL,
	budget_level VARCHAR(8) NOT NULL,
	best_months VARCHAR(100),
	avg_temp_c DECIMAL(4, 1),
	tags TEXT,
	image_url VARCHAR(500),
	latitude DECIMAL(9, 6),
	longitude DECIMAL(9, 6),
	chroma_doc_id VARCHAR(100),
	created_at TIMESTAMP WITHOUT TIME ZONE,
	updated_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	CHECK (climate_type IN ('tropical', 'temperate', 'arid', 'cold', 'mediterranean')),
	CHECK (destination_type IN ('beach', 'mountain', 'city', 'countryside', 'adventure', 'cultural')),
	CHECK (budget_level IN ('budget', 'moderate', 'luxury'))
);

REVOKE ALL ON TABLE "travellant"."destinations" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."destinations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."destinations" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."destinations" TO travellant_app;

CREATE TABLE travellant.security_rate_limits (
	key VARCHAR(64) NOT NULL,
	hits INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	PRIMARY KEY (key)
);

CREATE INDEX ix_travellant_security_rate_limits_expires_at ON travellant.security_rate_limits (expires_at);

REVOKE ALL ON TABLE "travellant"."security_rate_limits" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."security_rate_limits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."security_rate_limits" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."security_rate_limits" TO travellant_app;

CREATE TABLE travellant.users (
	id SERIAL NOT NULL,
	username VARCHAR(50) NOT NULL,
	email VARCHAR(255) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	full_name VARCHAR(100),
	avatar_url VARCHAR(500),
	created_at TIMESTAMP WITHOUT TIME ZONE,
	updated_at TIMESTAMP WITHOUT TIME ZONE,
	is_active BOOLEAN,
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_travellant_users_email ON travellant.users (email);

CREATE UNIQUE INDEX ix_travellant_users_username ON travellant.users (username);

REVOKE ALL ON TABLE "travellant"."users" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."users" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."users" TO travellant_app;

CREATE TABLE travellant.destination_embeddings (
	destination_id INTEGER NOT NULL,
	model_name VARCHAR(255) NOT NULL,
	document TEXT NOT NULL,
	embedding JSON NOT NULL,
	PRIMARY KEY (destination_id),
	FOREIGN KEY(destination_id) REFERENCES travellant.destinations (id) ON DELETE CASCADE
);

CREATE INDEX ix_travellant_destination_embeddings_model_name ON travellant.destination_embeddings (model_name);

REVOKE ALL ON TABLE "travellant"."destination_embeddings" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."destination_embeddings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."destination_embeddings" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."destination_embeddings" TO travellant_app;

CREATE TABLE travellant.itineraries (
	id SERIAL NOT NULL,
	user_id INTEGER NOT NULL,
	destination_id INTEGER,
	title VARCHAR(255) NOT NULL,
	destination_name VARCHAR(150) NOT NULL,
	duration_days SMALLINT NOT NULL,
	budget VARCHAR(8) NOT NULL,
	travel_style VARCHAR(50),
	summary TEXT,
	full_itinerary TEXT NOT NULL,
	status VARCHAR(8),
	is_favorite BOOLEAN,
	rating SMALLINT,
	user_notes TEXT,
	generated_at TIMESTAMP WITHOUT TIME ZONE,
	updated_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	CHECK (budget IN ('budget', 'moderate', 'luxury')),
	CHECK (status IN ('draft', 'saved', 'archived')),
	CONSTRAINT ck_itin_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
	FOREIGN KEY(user_id) REFERENCES travellant.users (id) ON DELETE CASCADE,
	FOREIGN KEY(destination_id) REFERENCES travellant.destinations (id) ON DELETE SET NULL,
	CONSTRAINT ck_itin_duration CHECK (duration_days BETWEEN 1 AND 30),
	CONSTRAINT ck_itin_json CHECK ((full_itinerary IS JSON))
);

CREATE INDEX idx_itin_user_generated ON travellant.itineraries (user_id, generated_at);

REVOKE ALL ON TABLE "travellant"."itineraries" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."itineraries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."itineraries" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."itineraries" TO travellant_app;

CREATE TABLE travellant.refresh_tokens (
	id SERIAL NOT NULL,
	user_id INTEGER NOT NULL,
	token_hash VARCHAR(255) NOT NULL,
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE,
	revoked BOOLEAN,
	PRIMARY KEY (id),
	UNIQUE (token_hash),
	FOREIGN KEY(user_id) REFERENCES travellant.users (id) ON DELETE CASCADE
);

REVOKE ALL ON TABLE "travellant"."refresh_tokens" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."refresh_tokens" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."refresh_tokens" TO travellant_app;

CREATE TABLE travellant.user_preferences (
	id SERIAL NOT NULL,
	user_id INTEGER NOT NULL,
	budget VARCHAR(8),
	preferred_climate VARCHAR(13),
	destination_type VARCHAR(11),
	trip_duration SMALLINT,
	travel_style VARCHAR(50),
	interests TEXT,
	dietary_needs VARCHAR(255),
	accessibility BOOLEAN,
	created_at TIMESTAMP WITHOUT TIME ZONE,
	updated_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	CHECK (budget IN ('budget', 'moderate', 'luxury')),
	CHECK (preferred_climate IN ('tropical', 'temperate', 'arid', 'cold', 'mediterranean', 'any')),
	CHECK (destination_type IN ('beach', 'mountain', 'city', 'countryside', 'adventure', 'cultural', 'any')),
	CONSTRAINT uq_preferences_user UNIQUE (user_id),
	FOREIGN KEY(user_id) REFERENCES travellant.users (id) ON DELETE CASCADE,
	CONSTRAINT ck_pref_duration CHECK (trip_duration IS NOT NULL AND trip_duration BETWEEN 1 AND 30),
	CONSTRAINT ck_pref_interests_json CHECK (interests IS NULL OR (interests IS JSON))
);

REVOKE ALL ON TABLE "travellant"."user_preferences" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."user_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."user_preferences" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."user_preferences" TO travellant_app;

CREATE TABLE travellant.itinerary_days (
	id SERIAL NOT NULL,
	itinerary_id INTEGER NOT NULL,
	day_number SMALLINT NOT NULL,
	theme VARCHAR(255),
	morning TEXT,
	afternoon TEXT,
	evening TEXT,
	accommodation VARCHAR(255),
	estimated_cost DECIMAL(10, 2),
	tips TEXT,
	PRIMARY KEY (id),
	CONSTRAINT ck_day_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
	CONSTRAINT uq_itin_day UNIQUE (itinerary_id, day_number),
	FOREIGN KEY(itinerary_id) REFERENCES travellant.itineraries (id) ON DELETE CASCADE,
	CONSTRAINT ck_day_number CHECK (day_number BETWEEN 1 AND 30)
);

REVOKE ALL ON TABLE "travellant"."itinerary_days" FROM PUBLIC, anon, authenticated;

ALTER TABLE "travellant"."itinerary_days" ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_access ON "travellant"."itinerary_days" FOR ALL TO travellant_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "travellant"."itinerary_days" TO travellant_app;

GRANT USAGE ON SCHEMA "travellant" TO travellant_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "travellant" TO travellant_app;

ALTER ROLE travellant_app SET search_path TO "travellant", pg_catalog;

ALTER ROLE travellant_app SET statement_timeout = '30s';

ALTER ROLE travellant_app SET idle_in_transaction_session_timeout = '30s';
