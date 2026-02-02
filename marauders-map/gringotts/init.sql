-- =============================================================================
-- GRINGOTTS VAULT: Shared Database Schema for The Marauder's Map
-- =============================================================================
-- PostgreSQL 16+ required
-- This schema is shared across all three implementations:
--   - Gryffindor (React + Express)
--   - Slytherin (Angular + .NET)
--   - Ravenclaw (Spring Boot + Java)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE severity_level AS ENUM (
    'MISCHIEF',        -- Minor rule breaking, pranks
    'SUSPICIOUS',      -- Questionable behavior worth monitoring
    'DANGEROUS',       -- Serious threat requiring immediate attention
    'UNFORGIVABLE'     -- Dark magic, highest severity
);

CREATE TYPE incident_status AS ENUM (
    'OPEN',            -- Newly reported, not yet assigned
    'IN_PROGRESS',     -- Being investigated
    'RESOLVED',        -- Closed successfully
    'ARCHIVED'         -- Historical record
);

CREATE TYPE location_type AS ENUM (
    'HOGWARTS',
    'HOGSMEADE',
    'KNOCKTURN_ALLEY',
    'FORBIDDEN_FOREST',
    'MINISTRY',
    'AZKABAN',
    'DIAGON_ALLEY',
    'PLATFORM_9_3_4'
);

CREATE TYPE user_role AS ENUM (
    'STUDENT',         -- Can view MISCHIEF incidents only
    'PREFECT',         -- Can view/manage up to DANGEROUS
    'AUROR'            -- Full access including UNFORGIVABLE
);

CREATE TYPE house_name AS ENUM (
    'GRYFFINDOR',
    'SLYTHERIN',
    'RAVENCLAW',
    'HUFFLEPUFF'
);

CREATE TYPE notification_type AS ENUM (
    'INCIDENT_CREATED',
    'INCIDENT_ESCALATED',
    'INCIDENT_RESOLVED',
    'COMMENT_ADDED',
    'MENTION'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users: Ministry employees and Hogwarts staff/students
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                user_role NOT NULL DEFAULT 'STUDENT',

    -- Personal information
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    house               house_name,
    avatar_url          TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at       TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,

    -- Constraints
    CONSTRAINT email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT name_not_empty CHECK (
        LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0
    )
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- incidents: Dark magic and suspicious activity reports
-- -----------------------------------------------------------------------------
CREATE TABLE incidents (
    id                  BIGSERIAL PRIMARY KEY,

    -- Core fields
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    severity            severity_level NOT NULL DEFAULT 'MISCHIEF',
    location            location_type NOT NULL,
    status              incident_status NOT NULL DEFAULT 'OPEN',

    -- Audit trail
    reported_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reported_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at         TIMESTAMP WITH TIME ZONE,
    resolved_by         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Metadata
    tags                TEXT[],
    evidence_urls       TEXT[],
    witness_count       INTEGER DEFAULT 0 CHECK (witness_count >= 0),

    -- Full-text search
    search_vector       TSVECTOR,

    -- Soft delete
    deleted_at          TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT valid_resolution CHECK (
        (status = 'RESOLVED' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL) OR
        (status != 'RESOLVED')
    ),
    CONSTRAINT resolved_after_reported CHECK (
        resolved_at IS NULL OR resolved_at >= reported_at
    )
);

-- Indexes for incidents
CREATE INDEX idx_incidents_severity ON incidents(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_location ON incidents(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_resolved_by ON incidents(resolved_by);

-- Full-text search index
CREATE INDEX idx_incidents_search ON incidents USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX idx_incidents_status_severity
    ON incidents(status, severity)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_incidents_location_status
    ON incidents(location, status)
    WHERE deleted_at IS NULL;

-- Partial index for active incidents (most common query)
CREATE INDEX idx_incidents_active
    ON incidents(reported_at DESC)
    WHERE status != 'ARCHIVED' AND deleted_at IS NULL;

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION incidents_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.location::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_search_update
    BEFORE INSERT OR UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION incidents_search_vector_update();

-- Trigger to update updated_at
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- incident_comments: Discussion threads on incidents
-- -----------------------------------------------------------------------------
CREATE TABLE incident_comments (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    content             TEXT NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,

    CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Indexes for comments
CREATE INDEX idx_comments_incident ON incident_comments(incident_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON incident_comments(user_id);

-- Trigger
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON incident_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- incident_history: Audit log for all incident changes (Year 6: Event Sourcing)
-- -----------------------------------------------------------------------------
CREATE TABLE incident_history (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,

    changed_by          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    changed_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    field_name          VARCHAR(50) NOT NULL,
    old_value           TEXT,
    new_value           TEXT NOT NULL,

    -- For event sourcing pattern (Year 6)
    event_type          VARCHAR(50),
    event_payload       JSONB,
    sequence_number     BIGINT
);

-- Indexes for history
CREATE INDEX idx_history_incident ON incident_history(incident_id, changed_at DESC);
CREATE INDEX idx_history_user ON incident_history(changed_by);
CREATE INDEX idx_history_event_type ON incident_history(event_type)
    WHERE event_type IS NOT NULL;

-- Sequence for event sourcing
CREATE SEQUENCE IF NOT EXISTS incident_event_sequence;

-- -----------------------------------------------------------------------------
-- notifications: Push notifications for users
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type                notification_type NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,

    incident_id         BIGINT REFERENCES incidents(id) ON DELETE CASCADE,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at             TIMESTAMP WITH TIME ZONE,

    -- Extensibility
    metadata            JSONB
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_incident ON notifications(incident_id);

-- -----------------------------------------------------------------------------
-- sessions: Server-side sessions (for cookie-based auth)
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token_hash          VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit
    ip_address          INET,
    user_agent          TEXT,

    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE expires_at > NOW();

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- refresh_tokens: JWT refresh token rotation
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token_hash          VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at          TIMESTAMP WITH TIME ZONE,
    replaced_by_token   BIGINT REFERENCES refresh_tokens(id) ON DELETE SET NULL,

    CONSTRAINT valid_token_expiry CHECK (expires_at > created_at)
);

-- Indexes for refresh tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash)
    WHERE revoked_at IS NULL;

-- =============================================================================
-- MATERIALIZED VIEWS (Year 5: Analytics)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- analytics_overview: Dashboard metrics
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW analytics_overview AS
SELECT
    COUNT(*) FILTER (WHERE reported_at >= NOW() - INTERVAL '30 days') AS total_incidents_30d,
    COUNT(*) FILTER (WHERE status = 'OPEN') AS open_incidents,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_incidents,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_incidents,

    -- Average resolution time in hours
    AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600)
        FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours,

    -- Most common location
    mode() WITHIN GROUP (ORDER BY location) AS most_common_location,

    -- Severity breakdown
    COUNT(*) FILTER (WHERE severity = 'MISCHIEF') AS mischief_count,
    COUNT(*) FILTER (WHERE severity = 'SUSPICIOUS') AS suspicious_count,
    COUNT(*) FILTER (WHERE severity = 'DANGEROUS') AS dangerous_count,
    COUNT(*) FILTER (WHERE severity = 'UNFORGIVABLE') AS unforgivable_count,

    -- Last updated
    NOW() AS last_refreshed
FROM incidents
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ON analytics_overview (last_refreshed);

-- -----------------------------------------------------------------------------
-- leaderboard: Performance rankings (Year 5)
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    u.id,
    u.first_name || ' ' || u.last_name AS full_name,
    u.house,
    u.avatar_url,

    COUNT(i.id) AS incidents_resolved,

    AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.reported_at))/3600) AS avg_resolution_hours,

    -- Point system
    SUM(CASE
        WHEN i.severity = 'MISCHIEF' THEN 10
        WHEN i.severity = 'SUSPICIOUS' THEN 25
        WHEN i.severity = 'DANGEROUS' THEN 50
        WHEN i.severity = 'UNFORGIVABLE' THEN 100
    END) AS total_points,

    -- Rank
    RANK() OVER (ORDER BY SUM(CASE
        WHEN i.severity = 'MISCHIEF' THEN 10
        WHEN i.severity = 'SUSPICIOUS' THEN 25
        WHEN i.severity = 'DANGEROUS' THEN 50
        WHEN i.severity = 'UNFORGIVABLE' THEN 100
    END) DESC NULLS LAST) AS rank
FROM users u
LEFT JOIN incidents i ON i.resolved_by = u.id
    AND i.resolved_at >= NOW() - INTERVAL '30 days'
    AND i.deleted_at IS NULL
WHERE u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.house, u.avatar_url
ORDER BY total_points DESC NULLS LAST;

CREATE UNIQUE INDEX ON leaderboard (id);
CREATE INDEX ON leaderboard (rank);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- escalate_incident_severity: Escalate and notify
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escalate_incident_severity(
    p_incident_id BIGINT,
    p_new_severity severity_level,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_old_severity severity_level;
    v_title TEXT;
BEGIN
    -- Get current severity and title
    SELECT severity, title INTO v_old_severity, v_title
    FROM incidents
    WHERE id = p_incident_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident % not found', p_incident_id;
    END IF;

    -- Prevent downgrade
    IF p_new_severity::text < v_old_severity::text THEN
        RAISE EXCEPTION 'Cannot downgrade severity from % to %',
            v_old_severity, p_new_severity;
    END IF;

    -- Update incident
    UPDATE incidents
    SET severity = p_new_severity,
        updated_at = NOW()
    WHERE id = p_incident_id;

    -- Log history
    INSERT INTO incident_history (incident_id, changed_by, field_name, old_value, new_value)
    VALUES (p_incident_id, p_user_id, 'severity', v_old_severity::text, p_new_severity::text);

    -- Notify all Aurors (DANGEROUS and above)
    IF p_new_severity IN ('DANGEROUS', 'UNFORGIVABLE') THEN
        INSERT INTO notifications (user_id, type, title, message, incident_id)
        SELECT
            u.id,
            'INCIDENT_ESCALATED',
            'Incident Escalated to ' || p_new_severity,
            'Incident #' || p_incident_id || ': "' || v_title || '" escalated from ' ||
                v_old_severity || ' to ' || p_new_severity,
            p_incident_id
        FROM users u
        WHERE u.role = 'AUROR' AND u.is_active = TRUE AND u.id != p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- resolve_incident: Mark as resolved with validation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_incident(
    p_incident_id BIGINT,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_title TEXT;
BEGIN
    -- Verify incident exists
    SELECT title INTO v_title
    FROM incidents
    WHERE id = p_incident_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident % not found', p_incident_id;
    END IF;

    -- Update incident
    UPDATE incidents
    SET status = 'RESOLVED',
        resolved_at = NOW(),
        resolved_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_incident_id;

    -- Log history
    INSERT INTO incident_history (incident_id, changed_by, field_name, old_value, new_value)
    VALUES (p_incident_id, p_user_id, 'status', 'OPEN', 'RESOLVED');

    -- Notify reporter
    INSERT INTO notifications (user_id, type, title, message, incident_id)
    SELECT
        i.reported_by,
        'INCIDENT_RESOLVED',
        'Your Incident Was Resolved',
        'Incident #' || p_incident_id || ': "' || v_title || '" has been resolved',
        p_incident_id
    FROM incidents i
    WHERE i.id = p_incident_id AND i.reported_by != p_user_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- refresh_analytics: Refresh materialized views
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_overview;
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default users (passwords are all 'password' hashed with bcrypt cost 12)
INSERT INTO users (email, password_hash, role, first_name, last_name, house) VALUES
    ('harry.potter@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'AUROR', 'Harry', 'Potter', 'GRYFFINDOR'),
    ('hermione.granger@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'PREFECT', 'Hermione', 'Granger', 'GRYFFINDOR'),
    ('ron.weasley@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'PREFECT', 'Ron', 'Weasley', 'GRYFFINDOR'),
    ('draco.malfoy@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'PREFECT', 'Draco', 'Malfoy', 'SLYTHERIN'),
    ('luna.lovegood@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'STUDENT', 'Luna', 'Lovegood', 'RAVENCLAW'),
    ('neville.longbottom@hogwarts.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BFbZCM7u.', 'STUDENT', 'Neville', 'Longbottom', 'GRYFFINDOR');

-- Insert sample incidents
INSERT INTO incidents (title, description, severity, location, reported_by, tags)
SELECT
    'Suspicious activity in ' || loc.location::text,
    'Multiple reports of unusual magical signatures detected',
    (ARRAY['MISCHIEF', 'SUSPICIOUS', 'DANGEROUS']::severity_level[])[floor(random() * 3 + 1)],
    loc.location,
    (SELECT id FROM users ORDER BY random() LIMIT 1),
    ARRAY['investigation', 'ongoing']
FROM (
    SELECT unnest(enum_range(NULL::location_type)) AS location
) loc
LIMIT 10;

-- Insert a resolved incident
DO $$
DECLARE
    v_incident_id BIGINT;
    v_resolver_id UUID;
BEGIN
    SELECT id INTO v_incident_id FROM incidents LIMIT 1;
    SELECT id INTO v_resolver_id FROM users WHERE role = 'AUROR' LIMIT 1;

    PERFORM resolve_incident(v_incident_id, v_resolver_id);
END $$;

-- Refresh analytics
SELECT refresh_analytics();

-- =============================================================================
-- GRANTS (adjust as needed for your security model)
-- =============================================================================

-- Create application user (used by backend services)
CREATE USER marauders_app WITH PASSWORD 'change_this_password';

-- Grant privileges
GRANT CONNECT ON DATABASE marauders_map TO marauders_app;
GRANT USAGE ON SCHEMA public TO marauders_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marauders_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO marauders_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO marauders_app;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO marauders_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO marauders_app;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Gringotts Vault initialized successfully!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Incidents created: %', (SELECT COUNT(*) FROM incidents);
    RAISE NOTICE 'Analytics refreshed: %', (SELECT last_refreshed FROM analytics_overview);
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Default password for all users: password';
    RAISE NOTICE 'IMPORTANT: Change these passwords in production!';
    RAISE NOTICE '=================================================';
END $$;
