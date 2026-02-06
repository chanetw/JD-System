--
-- PostgreSQL database dump
--

\restrict nkYZGmmrN78fjngonllaD57NjoKUns9Hz6LoHn59PWikGN7eRgSK5D0MixUgwXt

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: audit_approvals_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_approvals_changes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_job_dj_id VARCHAR(50);
BEGIN
    -- Get job DJ_ID for reference
    SELECT dj_id INTO v_job_dj_id FROM jobs WHERE id = COALESCE(NEW.job_id, OLD.job_id);
    
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.approver_id,
            'CREATE',
            'approval',
            NEW.id,
            v_job_dj_id,
            NULL,
            to_jsonb(NEW),
            'Approval record created for job ' || v_job_dj_id
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status != OLD.status THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                NEW.approver_id,
                NEW.status::VARCHAR,
                'approval',
                NEW.id,
                v_job_dj_id,
                to_jsonb(OLD),
                to_jsonb(NEW),
                'Job ' || v_job_dj_id || ' ' || NEW.status || ' by approver'
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_approvals_changes() OWNER TO postgres;

--
-- Name: audit_jobs_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_jobs_changes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.requester_id,
            'CREATE',
            'job',
            NEW.id,
            NEW.dj_id,
            NULL,
            to_jsonb(NEW),
            'Job created: ' || NEW.subject
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant fields changed
        IF NEW.status != OLD.status 
           OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
           OR NEW.subject != OLD.subject
           OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                COALESCE(NEW.assignee_id, NEW.requester_id),
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE'
                    WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'RESTORE'
                    ELSE 'UPDATE'
                END,
                'job',
                NEW.id,
                NEW.dj_id,
                to_jsonb(OLD),
                to_jsonb(NEW),
                CASE 
                    WHEN NEW.status != OLD.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
                    WHEN NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN 'Assignee changed'
                    ELSE 'Job updated'
                END
            );
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM create_audit_log(
            OLD.tenant_id,
            OLD.requester_id,
            'HARD_DELETE',
            'job',
            OLD.id,
            OLD.dj_id,
            to_jsonb(OLD),
            NULL,
            'Job permanently deleted'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_jobs_changes() OWNER TO postgres;

--
-- Name: audit_users_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_users_changes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.id,
            'CREATE',
            'user',
            NEW.id,
            NEW.email,
            NULL,
            jsonb_build_object(
                'email', NEW.email,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'is_active', NEW.is_active
            ),
            'User account created'
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_active != OLD.is_active 
           OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                NEW.id,
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL THEN 'DEACTIVATE'
                    WHEN NOT NEW.is_active AND OLD.is_active THEN 'DEACTIVATE'
                    WHEN NEW.is_active AND NOT OLD.is_active THEN 'ACTIVATE'
                    ELSE 'UPDATE'
                END,
                'user',
                NEW.id,
                NEW.email,
                jsonb_build_object('is_active', OLD.is_active),
                jsonb_build_object('is_active', NEW.is_active),
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL THEN 'User account deleted'
                    WHEN NOT NEW.is_active THEN 'User account deactivated'
                    ELSE 'User account activated'
                END
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_users_changes() OWNER TO postgres;

--
-- Name: cleanup_deleted_records(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_deleted_records(p_days_old integer DEFAULT 90) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_jobs_deleted INTEGER := 0;
    v_users_deleted INTEGER := 0;
    v_attachments_deleted INTEGER := 0;
    v_comments_deleted INTEGER := 0;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := NOW() - (p_days_old || ' days')::INTERVAL;
    
    -- Delete old job attachments first (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        DELETE FROM job_attachments 
        WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
        GET DIAGNOSTICS v_attachments_deleted = ROW_COUNT;
    END IF;
    
    -- Delete old job comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        DELETE FROM job_comments 
        WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
        GET DIAGNOSTICS v_comments_deleted = ROW_COUNT;
    END IF;
    
    -- Delete old jobs
    DELETE FROM jobs 
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
    GET DIAGNOSTICS v_jobs_deleted = ROW_COUNT;
    
    -- Delete old users
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
    GET DIAGNOSTICS v_users_deleted = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'cutoff_date', v_cutoff_date,
        'jobs_deleted', v_jobs_deleted,
        'users_deleted', v_users_deleted,
        'attachments_deleted', v_attachments_deleted,
        'comments_deleted', v_comments_deleted
    );
END;
$$;


ALTER FUNCTION public.cleanup_deleted_records(p_days_old integer) OWNER TO postgres;

--
-- Name: FUNCTION cleanup_deleted_records(p_days_old integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cleanup_deleted_records(p_days_old integer) IS 'Permanently delete soft-deleted records older than specified days';


--
-- Name: create_audit_log(integer, integer, character varying, character varying, integer, character varying, jsonb, jsonb, text, jsonb, character varying, text, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_user_ip character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text, p_session_id character varying DEFAULT NULL::character varying, p_request_id character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_audit_id INTEGER;
    v_user_email VARCHAR(255);
    v_changed_fields TEXT[];
BEGIN
    -- Get user email
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;
    
    -- Calculate changed fields (for updates)
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT array_agg(key)
        INTO v_changed_fields
        FROM (
            SELECT key FROM jsonb_each(p_new_values)
            EXCEPT
            SELECT key FROM jsonb_each(p_old_values)
            WHERE p_new_values->key = p_old_values->key
        ) changed;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        tenant_id, user_id, user_email, user_ip, user_agent,
        action, entity_type, entity_id, entity_name,
        old_values, new_values, changed_fields,
        description, metadata, session_id, request_id
    )
    VALUES (
        p_tenant_id, p_user_id, v_user_email, p_user_ip, p_user_agent,
        p_action, p_entity_type, p_entity_id, p_entity_name,
        p_old_values, p_new_values, v_changed_fields,
        p_description, p_metadata, p_session_id, p_request_id
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;


ALTER FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) OWNER TO postgres;

--
-- Name: FUNCTION create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) IS 'Create a new audit log entry';


--
-- Name: create_job_with_items(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_job_id INT;
  v_result JSONB;
BEGIN
  -- 1. Insert Job
  INSERT INTO jobs (
    tenant_id,
    project_id,
    job_type_id,
    subject,
    objective,
    description,
    headline,
    sub_headline,
    priority,
    status,
    requester_id,
    due_date,
    created_at
  )
  VALUES (
    (p_job_data->>'tenant_id')::INT,
    (p_job_data->>'project_id')::INT,
    (p_job_data->>'job_type_id')::INT,
    p_job_data->>'subject',
    p_job_data->>'objective',
    p_job_data->>'description',
    p_job_data->>'headline',
    p_job_data->>'sub_headline',
    COALESCE(p_job_data->>'priority', 'normal'),
    COALESCE(p_job_data->>'status', 'pending_approval'),
    (p_job_data->>'requester_id')::INT,
    (p_job_data->>'due_date')::TIMESTAMP,
    NOW()
  )
  RETURNING id INTO v_job_id;

  -- 2. Insert Design Job Items
  INSERT INTO design_job_items (
    job_id,
    job_type_item_id,
    name,
    quantity,
    status,
    created_at
  )
  SELECT
    v_job_id,
    (item->>'job_type_item_id')::INT,
    item->>'name',
    (item->>'quantity')::INT,
    COALESCE(item->>'status', 'pending'),
    NOW()
  FROM jsonb_array_elements(p_items_data) AS item;

  -- 3. Return job data
  SELECT jsonb_build_object(
    'id', id,
    'dj_id', dj_id,
    'subject', subject,
    'status', status,
    'created_at', created_at
  ) INTO v_result
  FROM jobs
  WHERE id = v_job_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction จะ rollback อัตโนมัติ
    RAISE EXCEPTION 'Failed to create job with items: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) OWNER TO postgres;

--
-- Name: FUNCTION create_job_with_items(p_job_data jsonb, p_items_data jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) IS 'สร้าง job พร้อม items ในรูปแบบ transaction เดียว เพื่อป้องกัน orphaned records';


--
-- Name: debug_jwt(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.debug_jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$ SELECT auth.jwt(); $$;


ALTER FUNCTION public.debug_jwt() OWNER TO postgres;

--
-- Name: generate_dj_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_dj_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.dj_id IS NULL THEN
    NEW.dj_id := 'DJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('dj_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_dj_id() OWNER TO postgres;

--
-- Name: get_entity_audit_trail(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer DEFAULT 50) RETURNS TABLE(id integer, action character varying, user_email character varying, description text, old_values jsonb, new_values jsonb, changed_fields text[], created_at timestamp without time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.user_email,
        al.description,
        al.old_values,
        al.new_values,
        al.changed_fields,
        al.created_at
    FROM audit_logs al
    WHERE al.entity_type = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer) IS 'Get audit history for a specific entity';


--
-- Name: get_tenant_activity_summary(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_tenant_activity_summary(p_tenant_id integer, p_days integer DEFAULT 7) RETURNS TABLE(date date, action character varying, entity_type character varying, count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.created_at::DATE as date,
        al.action,
        al.entity_type,
        COUNT(*) as count
    FROM audit_logs al
    WHERE al.tenant_id = p_tenant_id
      AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY al.created_at::DATE, al.action, al.entity_type
    ORDER BY date DESC, count DESC;
END;
$$;


ALTER FUNCTION public.get_tenant_activity_summary(p_tenant_id integer, p_days integer) OWNER TO postgres;

--
-- Name: get_user_activity(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_activity(p_user_id integer, p_days integer DEFAULT 30, p_limit integer DEFAULT 100) RETURNS TABLE(id integer, action character varying, entity_type character varying, entity_name character varying, description text, created_at timestamp without time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_name,
        al.description,
        al.created_at
    FROM audit_logs al
    WHERE al.user_id = p_user_id
      AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_user_activity(p_user_id integer, p_days integer, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION get_user_activity(p_user_id integer, p_days integer, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_user_activity(p_user_id integer, p_days integer, p_limit integer) IS 'Get activity log for a specific user';


--
-- Name: restore_deleted_job(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if job exists and is deleted
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Job not found or not deleted';
    END IF;
    
    -- Restore the job
    UPDATE jobs 
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Restore related attachments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        UPDATE job_attachments 
        SET 
            deleted_at = NULL,
            deleted_by = NULL
        WHERE job_id = p_job_id AND deleted_at IS NOT NULL;
    END IF;
    
    -- Restore related comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        UPDATE job_comments 
        SET 
            deleted_at = NULL,
            deleted_by = NULL
        WHERE job_id = p_job_id AND deleted_at IS NOT NULL;
    END IF;
    
    -- Log activity (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_activities') THEN
        INSERT INTO job_activities (tenant_id, job_id, user_id, activity_type, description, metadata, created_at)
        SELECT tenant_id, p_job_id, p_restored_by, 'restored', 'Job was restored', '{"restored": true}'::jsonb, NOW()
        FROM jobs WHERE id = p_job_id;
    END IF;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'job_id', p_job_id,
        'restored_at', NOW()
    );
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) OWNER TO postgres;

--
-- Name: FUNCTION restore_deleted_job(p_job_id integer, p_restored_by integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) IS 'Restore a soft-deleted job and its related data';


--
-- Name: soft_delete_job(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if job exists and not already deleted
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Job not found or already deleted';
    END IF;
    
    -- Soft delete the job
    UPDATE jobs 
    SET 
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Soft delete related attachments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        UPDATE job_attachments 
        SET 
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE job_id = p_job_id AND deleted_at IS NULL;
    END IF;
    
    -- Soft delete related comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        UPDATE job_comments 
        SET 
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE job_id = p_job_id AND deleted_at IS NULL;
    END IF;
    
    -- Log activity (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_activities') THEN
        INSERT INTO job_activities (tenant_id, job_id, user_id, activity_type, description, metadata, created_at)
        SELECT tenant_id, p_job_id, p_deleted_by, 'deleted', 'Job was deleted', '{"soft_delete": true}'::jsonb, NOW()
        FROM jobs WHERE id = p_job_id;
    END IF;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'job_id', p_job_id,
        'deleted_at', NOW()
    );
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) OWNER TO postgres;

--
-- Name: FUNCTION soft_delete_job(p_job_id integer, p_deleted_by integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) IS 'Soft delete a job and its related data';


--
-- Name: soft_delete_user(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if user exists and not already deleted
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'User not found or already deleted';
    END IF;
    
    -- Soft delete the user
    UPDATE users 
    SET 
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Deactivate user roles
    UPDATE user_roles 
    SET is_active = FALSE
    WHERE user_id = p_user_id;
    
    -- Deactivate user scope assignments
    UPDATE user_scope_assignments 
    SET is_active = FALSE
    WHERE user_id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'deleted_at', NOW()
    );
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) OWNER TO postgres;

--
-- Name: FUNCTION soft_delete_user(p_user_id integer, p_deleted_by integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) IS 'Soft delete a user and deactivate their roles/scopes';


--
-- Name: update_parent_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_parent_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    parent_id INTEGER;
    total_children INTEGER;
    completed_children INTEGER;
    in_progress_children INTEGER;
BEGIN
    -- ถ้างานนี้มี parent
    IF NEW.parent_job_id IS NOT NULL THEN
        parent_id := NEW.parent_job_id;
        
        -- นับลูกทั้งหมด
        SELECT COUNT(*) INTO total_children
        FROM jobs WHERE parent_job_id = parent_id;
        
        -- นับลูกที่เสร็จแล้ว
        SELECT COUNT(*) INTO completed_children
        FROM jobs WHERE parent_job_id = parent_id AND status = 'completed';
        
        -- นับลูกที่กำลังทำ
        SELECT COUNT(*) INTO in_progress_children
        FROM jobs WHERE parent_job_id = parent_id AND status IN ('in_progress', 'rework');
        
        -- Update สถานะ Parent
        IF completed_children = total_children AND total_children > 0 THEN
            -- ลูกเสร็จหมด -> Parent เสร็จ
            UPDATE jobs SET status = 'completed', completed_at = NOW() WHERE id = parent_id;
        ELSIF in_progress_children > 0 THEN
            -- มีลูกกำลังทำ -> Parent กำลังทำ
            UPDATE jobs SET status = 'in_progress' WHERE id = parent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_parent_status() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_update_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_level_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.prefixes_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    job_id integer,
    user_id integer,
    action character varying(50),
    message text,
    detail jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: approval_flow_steps_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_flow_steps_archive (
    id integer,
    template_id integer,
    level integer,
    name character varying(100),
    approver_type character varying(50),
    required_approvals integer,
    created_at timestamp with time zone,
    archived_at timestamp with time zone
);


ALTER TABLE public.approval_flow_steps_archive OWNER TO postgres;

--
-- Name: approval_flow_templates_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_flow_templates_archive (
    id integer,
    tenant_id integer,
    name character varying(200),
    description text,
    total_levels integer,
    auto_assign_type character varying(50),
    auto_assign_user_id integer,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    archived_at timestamp with time zone
);


ALTER TABLE public.approval_flow_templates_archive OWNER TO postgres;

--
-- Name: approval_flows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_flows (
    id integer NOT NULL,
    project_id integer,
    job_type_id integer,
    level integer NOT NULL,
    approver_id integer,
    role character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    is_override boolean DEFAULT true,
    include_team_lead boolean DEFAULT false,
    team_lead_id integer,
    skip_approval boolean DEFAULT false,
    auto_assign_type character varying(50) DEFAULT 'manual'::character varying,
    auto_assign_user_id integer,
    name character varying(200) DEFAULT 'Default Flow'::character varying,
    description text,
    conditions jsonb,
    approver_steps jsonb,
    allow_override boolean DEFAULT false,
    effective_from date,
    effective_to date,
    tenant_id integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT approval_flows_auto_assign_type_check CHECK (((auto_assign_type)::text = ANY ((ARRAY['manual'::character varying, 'dept_manager'::character varying, 'team_lead'::character varying, 'specific_user'::character varying])::text[])))
);


ALTER TABLE public.approval_flows OWNER TO postgres;

--
-- Name: COLUMN approval_flows.is_override; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_flows.is_override IS 'TRUE = Override, FALSE = Master Default';


--
-- Name: COLUMN approval_flows.include_team_lead; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_flows.include_team_lead IS 'If TRUE, auto-assign to Team Lead after final approval';


--
-- Name: COLUMN approval_flows.team_lead_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_flows.team_lead_id IS 'Explicit team lead user ID for auto-assignment';


--
-- Name: approval_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_flows_id_seq OWNER TO postgres;

--
-- Name: approval_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_flows_id_seq OWNED BY public.approval_flows.id;


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approvals (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    job_id integer NOT NULL,
    step_number integer NOT NULL,
    approver_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    comment text,
    approved_at timestamp without time zone,
    approval_token character varying(64),
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approvals_id_seq OWNER TO postgres;

--
-- Name: approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer,
    user_email character varying(255),
    user_ip character varying(45),
    user_agent text,
    action character varying(50) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id integer,
    entity_name character varying(255),
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    session_id character varying(100),
    request_id character varying(100)
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all system changes';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: buds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buds (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(255) NOT NULL,
    code character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    description text
);


ALTER TABLE public.buds OWNER TO postgres;

--
-- Name: buds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.buds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buds_id_seq OWNER TO postgres;

--
-- Name: buds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.buds_id_seq OWNED BY public.buds.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    tenant_id integer,
    bud_id integer,
    name character varying(255) NOT NULL,
    code character varying(50),
    manager_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.departments IS 'Organization departments/teams with assigned managers';


--
-- Name: COLUMN departments.manager_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departments.manager_id IS 'Team Lead / Department Manager who oversees this department';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: design_job_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.design_job_items (
    id integer NOT NULL,
    job_id integer,
    job_type_item_id integer,
    name character varying(255) NOT NULL,
    quantity integer DEFAULT 1,
    status character varying(50) DEFAULT 'pending'::character varying,
    file_path text
);


ALTER TABLE public.design_job_items OWNER TO postgres;

--
-- Name: design_job_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.design_job_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.design_job_items_id_seq OWNER TO postgres;

--
-- Name: design_job_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.design_job_items_id_seq OWNED BY public.design_job_items.id;


--
-- Name: design_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.design_jobs (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    dj_id character varying(50) NOT NULL,
    subject text NOT NULL,
    brief text,
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    requester_id integer,
    assignee_id integer,
    job_type_id integer,
    deadline timestamp without time zone,
    submitted_at timestamp without time zone,
    assigned_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.design_jobs OWNER TO postgres;

--
-- Name: design_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.design_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.design_jobs_id_seq OWNER TO postgres;

--
-- Name: design_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.design_jobs_id_seq OWNED BY public.design_jobs.id;


--
-- Name: dj_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dj_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dj_id_seq OWNER TO postgres;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(255) NOT NULL,
    date date NOT NULL,
    type character varying(50) DEFAULT 'government'::character varying,
    is_recurring boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: job_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_activities (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    job_id integer NOT NULL,
    user_id integer,
    activity_type character varying(50) NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.job_activities OWNER TO postgres;

--
-- Name: job_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_activities_id_seq OWNER TO postgres;

--
-- Name: job_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_activities_id_seq OWNED BY public.job_activities.id;


--
-- Name: job_type_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_type_items (
    id integer NOT NULL,
    job_type_id integer,
    name character varying(255) NOT NULL,
    default_size character varying(100),
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.job_type_items OWNER TO postgres;

--
-- Name: job_type_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_type_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_type_items_id_seq OWNER TO postgres;

--
-- Name: job_type_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_type_items_id_seq OWNED BY public.job_type_items.id;


--
-- Name: job_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_types (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(100) NOT NULL,
    description text,
    sla_days integer DEFAULT 3,
    icon character varying(50),
    color_theme character varying(50),
    is_active boolean DEFAULT true,
    attachments text[],
    default_requires_approval boolean DEFAULT true,
    default_levels jsonb DEFAULT '[]'::jsonb,
    default_assignee_id integer
);


ALTER TABLE public.job_types OWNER TO postgres;

--
-- Name: job_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_types_id_seq OWNER TO postgres;

--
-- Name: job_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_types_id_seq OWNED BY public.job_types.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    tenant_id integer,
    project_id integer,
    job_type_id integer,
    dj_id character varying(50),
    subject character varying(255) NOT NULL,
    objective text,
    description text,
    headline character varying(255),
    sub_headline character varying(255),
    status character varying(50) DEFAULT 'draft'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    requester_id integer,
    assignee_id integer,
    due_date timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    close_requested_at timestamp with time zone,
    closed_at timestamp with time zone,
    close_requested_by integer,
    closed_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    original_due_date timestamp without time zone,
    shifted_by_job_id integer,
    artwork_count integer DEFAULT 1,
    cancel_reason text,
    cancelled_by integer,
    auto_approved_levels jsonb DEFAULT '[]'::jsonb,
    completed_by integer,
    final_files jsonb DEFAULT '[]'::jsonb,
    parent_job_id integer,
    is_parent boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by integer,
    assigned_at timestamp without time zone
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: COLUMN jobs.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.priority IS 'Priority of the job: Low, Normal, Urgent';


--
-- Name: COLUMN jobs.original_due_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.original_due_date IS 'Original due date before being shifted by urgent jobs';


--
-- Name: COLUMN jobs.shifted_by_job_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.shifted_by_job_id IS 'ID of the urgent job that caused this job to shift';


--
-- Name: COLUMN jobs.auto_approved_levels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.auto_approved_levels IS 'Array ของ Level ที่ Auto-Approve (เมื่อผู้บริหารสร้างงานเอง)';


--
-- Name: COLUMN jobs.completed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.completed_by IS 'ผู้ปิดงาน (Graphic Designer ที่ทำงานเสร็จ)';


--
-- Name: COLUMN jobs.final_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.final_files IS 'ไฟล์สุดท้ายที่ส่งมอบ [{"name": "file.ai", "url": "...", "size": 1024}]';


--
-- Name: COLUMN jobs.assigned_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.assigned_at IS 'Timestamp when job was assigned to assignee_id';


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_files (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    job_id integer,
    project_id integer,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint,
    file_type character varying(100),
    mime_type character varying(100),
    uploaded_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    thumbnail_path character varying(1000),
    download_count integer DEFAULT 0
);


ALTER TABLE public.media_files OWNER TO postgres;

--
-- Name: media_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.media_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_files_id_seq OWNER TO postgres;

--
-- Name: media_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.media_files_id_seq OWNED BY public.media_files.id;


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_logs (
    id integer NOT NULL,
    job_id integer,
    event_type character varying(50),
    recipient_type character varying(20),
    recipient_email character varying(255),
    recipient_user_id integer,
    subject character varying(255),
    body text,
    status character varying(20) DEFAULT 'pending'::character varying,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_logs OWNER TO postgres;

--
-- Name: notification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_logs_id_seq OWNER TO postgres;

--
-- Name: notification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_logs_id_seq OWNED BY public.notification_logs.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    job_id integer,
    link character varying(255),
    is_read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id integer
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_reset_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    otp_code character varying(6) NOT NULL,
    otp_expires_at timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.password_reset_requests OWNER TO postgres;

--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_requests_id_seq OWNER TO postgres;

--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_requests_id_seq OWNED BY public.password_reset_requests.id;


--
-- Name: project_flow_approvers_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_flow_approvers_archive (
    id integer,
    assignment_id integer,
    level integer,
    approver_id integer,
    is_active boolean,
    created_at timestamp with time zone,
    archived_at timestamp with time zone
);


ALTER TABLE public.project_flow_approvers_archive OWNER TO postgres;

--
-- Name: project_flow_assignments_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_flow_assignments_archive (
    id integer,
    tenant_id integer,
    project_id integer,
    job_type_id integer,
    template_id integer,
    override_auto_assign boolean,
    auto_assign_type character varying(50),
    auto_assign_user_id integer,
    is_active boolean,
    created_at timestamp with time zone,
    archived_at timestamp with time zone
);


ALTER TABLE public.project_flow_assignments_archive OWNER TO postgres;

--
-- Name: project_job_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_job_assignments (
    id integer NOT NULL,
    project_id integer,
    job_type_id integer,
    assignee_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.project_job_assignments OWNER TO postgres;

--
-- Name: TABLE project_job_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_job_assignments IS 'ตารางเก็บการจับคู่ โครงการ+ประเภทงาน กับ ผู้รับงานเริ่มต้น';


--
-- Name: COLUMN project_job_assignments.project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_job_assignments.project_id IS 'ID ของโครงการ';


--
-- Name: COLUMN project_job_assignments.job_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_job_assignments.job_type_id IS 'ID ของประเภทงาน';


--
-- Name: COLUMN project_job_assignments.assignee_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_job_assignments.assignee_id IS 'ID ของผู้รับงานเริ่มต้น';


--
-- Name: project_job_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_job_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_job_assignments_id_seq OWNER TO postgres;

--
-- Name: project_job_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_job_assignments_id_seq OWNED BY public.project_job_assignments.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    tenant_id integer,
    bud_id integer,
    department_id integer,
    name character varying(255) NOT NULL,
    code character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: sla_shift_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_shift_logs (
    id integer NOT NULL,
    job_id integer,
    urgent_job_id integer,
    original_due_date timestamp without time zone,
    new_due_date timestamp without time zone,
    shift_days integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sla_shift_logs OWNER TO postgres;

--
-- Name: sla_shift_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sla_shift_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sla_shift_logs_id_seq OWNER TO postgres;

--
-- Name: sla_shift_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sla_shift_logs_id_seq OWNED BY public.sla_shift_logs.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    subdomain character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    logo_url character varying(500),
    primary_color character varying(20) DEFAULT '#E11D48'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: user_registration_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_registration_requests (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    email character varying(255) NOT NULL,
    title character varying(50),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    department character varying(100) NOT NULL,
    "position" character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying,
    rejected_reason text,
    approved_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_registration_requests OWNER TO postgres;

--
-- Name: user_registration_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_registration_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_registration_requests_id_seq OWNER TO postgres;

--
-- Name: user_registration_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_registration_requests_id_seq OWNED BY public.user_registration_requests.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_roles IS 'เก็บ Role ของ User (สามารถมี Multiple Roles ต่อ User ได้)';


--
-- Name: COLUMN user_roles.role_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_roles.role_name IS 'ชื่อบทบาท: admin, requester, approver, assignee';


--
-- Name: COLUMN user_roles.assigned_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_roles.assigned_by IS 'Admin ผู้กำหนดบทบาท';


--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: user_scope_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_scope_assignments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    scope_level character varying(20) NOT NULL,
    scope_id integer,
    scope_name character varying(255),
    role_type character varying(50),
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_scope_assignments OWNER TO postgres;

--
-- Name: TABLE user_scope_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_scope_assignments IS 'เก็บการกำหนด Scope/Project ให้ User (เช่น ผู้เปิดงานสร้าง DJ ได้ โครงการไหนบ้าง)';


--
-- Name: COLUMN user_scope_assignments.scope_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_scope_assignments.scope_level IS 'ระดับ: Tenant (บริษัท), BUD (สายงาน), Project (โครงการ)';


--
-- Name: COLUMN user_scope_assignments.scope_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_scope_assignments.scope_id IS 'ID ของ Scope (NULL สำหรับ Tenant level)';


--
-- Name: COLUMN user_scope_assignments.role_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_scope_assignments.role_type IS 'ประเภท Role สำหรับ Scope นี้ (requester_allowed, assignee_assigned, etc.)';


--
-- Name: user_scope_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_scope_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_scope_assignments_id_seq OWNER TO postgres;

--
-- Name: user_scope_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_scope_assignments_id_seq OWNED BY public.user_scope_assignments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    tenant_id integer,
    department_id integer,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    display_name character varying(255),
    role character varying(50),
    phone_number character varying(50),
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    title character varying(50),
    must_change_password boolean DEFAULT false,
    sso_provider character varying(50),
    sso_user_id character varying(255),
    deleted_at timestamp without time zone,
    deleted_by integer,
    department character varying(255),
    updated_at timestamp without time zone DEFAULT now(),
    password_hash character varying(255) DEFAULT ''::character varying,
    roles text[] DEFAULT ARRAY['user'::text],
    status character varying(50) DEFAULT 'APPROVED'::character varying,
    registered_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by integer,
    rejection_reason text,
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.department_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.department_id IS 'Foreign key to departments table';


--
-- Name: COLUMN users.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.title IS 'คำนำหน้าชื่อ (Mr., Ms., Dr., etc.)';


--
-- Name: COLUMN users.must_change_password; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.must_change_password IS 'บังคับเปลี่ยนรหัสผ่านครั้งแรก (Admin Create User)';


--
-- Name: COLUMN users.sso_provider; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.sso_provider IS 'SSO Provider (azure_ad, google, etc.)';


--
-- Name: COLUMN users.sso_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.sso_user_id IS 'User ID จาก SSO Provider';


--
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.department IS 'หน่วยงาน/แผนก ของ User';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.status IS 'Registration status: PENDING, APPROVED, REJECTED, INACTIVE';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_active_jobs; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_active_jobs WITH (security_invoker='true') AS
 SELECT id,
    tenant_id,
    project_id,
    job_type_id,
    dj_id,
    subject,
    objective,
    description,
    headline,
    sub_headline,
    status,
    priority,
    requester_id,
    assignee_id,
    due_date,
    started_at,
    completed_at,
    close_requested_at,
    closed_at,
    close_requested_by,
    closed_by,
    created_at,
    updated_at,
    original_due_date,
    shifted_by_job_id,
    artwork_count,
    cancel_reason,
    cancelled_by,
    auto_approved_levels,
    completed_by,
    final_files,
    parent_job_id,
    is_parent,
    deleted_at,
    deleted_by
   FROM public.jobs
  WHERE (deleted_at IS NULL);


ALTER VIEW public.v_active_jobs OWNER TO postgres;

--
-- Name: v_active_users; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_active_users WITH (security_invoker='true') AS
 SELECT id,
    tenant_id,
    department_id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    phone_number,
    avatar_url,
    is_active,
    created_at,
    title,
    must_change_password,
    sso_provider,
    sso_user_id,
    deleted_at,
    deleted_by
   FROM public.users
  WHERE ((deleted_at IS NULL) AND (is_active = true));


ALTER VIEW public.v_active_users OWNER TO postgres;

--
-- Name: v_parent_jobs; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_parent_jobs WITH (security_invoker='true') AS
 SELECT id,
    tenant_id,
    dj_id,
    subject,
    project_id,
    requester_id,
    priority,
    status AS parent_status,
    created_at,
    due_date AS parent_deadline,
    ( SELECT count(*) AS count
           FROM public.jobs c
          WHERE (c.parent_job_id = p.id)) AS child_count,
    ( SELECT count(*) AS count
           FROM public.jobs c
          WHERE ((c.parent_job_id = p.id) AND ((c.status)::text = 'completed'::text))) AS completed_count,
    ( SELECT max(c.due_date) AS max
           FROM public.jobs c
          WHERE (c.parent_job_id = p.id)) AS max_child_deadline
   FROM public.jobs p
  WHERE (is_parent = true);


ALTER VIEW public.v_parent_jobs OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_01_31; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_01_31 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_01_31 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_01; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_01 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_02; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_02 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_03; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_03 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_04; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_04 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_04 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_05; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_05 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_05 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_06; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_06 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: messages_2026_01_31; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_31 FOR VALUES FROM ('2026-01-31 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: messages_2026_02_01; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_01 FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-02-02 00:00:00');


--
-- Name: messages_2026_02_02; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_02 FOR VALUES FROM ('2026-02-02 00:00:00') TO ('2026-02-03 00:00:00');


--
-- Name: messages_2026_02_03; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_03 FOR VALUES FROM ('2026-02-03 00:00:00') TO ('2026-02-04 00:00:00');


--
-- Name: messages_2026_02_04; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_04 FOR VALUES FROM ('2026-02-04 00:00:00') TO ('2026-02-05 00:00:00');


--
-- Name: messages_2026_02_05; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_05 FOR VALUES FROM ('2026-02-05 00:00:00') TO ('2026-02-06 00:00:00');


--
-- Name: messages_2026_02_06; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_06 FOR VALUES FROM ('2026-02-06 00:00:00') TO ('2026-02-07 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: approval_flows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows ALTER COLUMN id SET DEFAULT nextval('public.approval_flows_id_seq'::regclass);


--
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: buds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buds ALTER COLUMN id SET DEFAULT nextval('public.buds_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: design_job_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_job_items ALTER COLUMN id SET DEFAULT nextval('public.design_job_items_id_seq'::regclass);


--
-- Name: design_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs ALTER COLUMN id SET DEFAULT nextval('public.design_jobs_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: job_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_activities ALTER COLUMN id SET DEFAULT nextval('public.job_activities_id_seq'::regclass);


--
-- Name: job_type_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_type_items ALTER COLUMN id SET DEFAULT nextval('public.job_type_items_id_seq'::regclass);


--
-- Name: job_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_types ALTER COLUMN id SET DEFAULT nextval('public.job_types_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: media_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files ALTER COLUMN id SET DEFAULT nextval('public.media_files_id_seq'::regclass);


--
-- Name: notification_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs ALTER COLUMN id SET DEFAULT nextval('public.notification_logs_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_reset_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests ALTER COLUMN id SET DEFAULT nextval('public.password_reset_requests_id_seq'::regclass);


--
-- Name: project_job_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments ALTER COLUMN id SET DEFAULT nextval('public.project_job_assignments_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: sla_shift_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_shift_logs ALTER COLUMN id SET DEFAULT nextval('public.sla_shift_logs_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: user_registration_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registration_requests ALTER COLUMN id SET DEFAULT nextval('public.user_registration_requests_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: user_scope_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_scope_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_scope_assignments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, job_id, user_id, action, message, detail, created_at) FROM stdin;
1	22	12	assigned	Reassigned to Admin SENX. Note: Testing Reassignment by AI	\N	2026-01-23 10:45:25.415942+00
2	22	12	assigned	Reassigned to Graphic SENX. Note: -	\N	2026-01-23 10:50:09.515476+00
3	22	12	assigned	Reassigned to Graphic SENX. Note: -	\N	2026-01-23 10:50:59.159836+00
4	22	12	assigned	Reassigned to Marketing SENX. Note: -	\N	2026-01-23 10:51:30.259508+00
6	22	12	approve	Approved via Web	\N	2026-01-23 11:04:04.502751+00
\.


--
-- Data for Name: approval_flow_steps_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_flow_steps_archive (id, template_id, level, name, approver_type, required_approvals, created_at, archived_at) FROM stdin;
1	4	1	หัวหน้าแผนก	dept_manager	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
2	5	1	หัวหน้าแผนก	dept_manager	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
4	7	1	Team Lead	team_lead	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
5	8	1	Team Lead	team_lead	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
7	7	2	หัวหน้าแผนก	dept_manager	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
8	8	2	หัวหน้าแผนก	dept_manager	1	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
10	11	1	Manager Check	dept_manager	1	2026-01-29 07:37:53.724+00	2026-01-31 16:37:39.900354+00
\.


--
-- Data for Name: approval_flow_templates_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_flow_templates_archive (id, tenant_id, name, description, total_levels, auto_assign_type, auto_assign_user_id, is_active, created_at, updated_at, archived_at) FROM stdin;
1	2	Skip Approval	ไม่ต้องมีการอนุมัติ ส่งงานตรงไปยัง Assignee	0	manual	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
2	1	Skip Approval	ไม่ต้องมีการอนุมัติ ส่งงานตรงไปยัง Assignee	0	manual	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
4	2	Single Level Approval	อนุมัติ 1 ขั้นตอน โดยหัวหน้าแผนก	1	dept_manager	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
5	1	Single Level Approval	อนุมัติ 1 ขั้นตอน โดยหัวหน้าแผนก	1	dept_manager	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
7	2	Two Level Approval	อนุมัติ 2 ขั้นตอน (Team Lead + หัวหน้าแผนก)	2	team_lead	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
8	1	Two Level Approval	อนุมัติ 2 ขั้นตอน (Team Lead + หัวหน้าแผนก)	2	team_lead	\N	t	2026-01-29 07:17:59.272971+00	2026-01-29 07:17:59.272971+00	2026-01-31 16:37:39.900354+00
10	2	V2 Test Skip Template	\N	0	manual	\N	t	2026-01-29 07:37:50.478+00	2026-01-29 07:37:50.478+00	2026-01-31 16:37:39.900354+00
11	2	V2 Standard Template	\N	1	manual	\N	t	2026-01-29 07:37:53.724+00	2026-01-29 07:37:53.724+00	2026-01-31 16:37:39.900354+00
\.


--
-- Data for Name: approval_flows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_flows (id, project_id, job_type_id, level, approver_id, role, is_active, created_at, is_override, include_team_lead, team_lead_id, skip_approval, auto_assign_type, auto_assign_user_id, name, description, conditions, approver_steps, allow_override, effective_from, effective_to, tenant_id, updated_at) FROM stdin;
3	2	\N	1	3	manager	t	2026-01-20 13:44:45.554997+00	t	f	\N	f	manual	\N	Default Flow	\N	\N	\N	f	\N	\N	1	2026-02-01 14:05:29.82407+00
50	1	\N	1	8	\N	f	2026-01-27 15:19:40.699341+00	t	f	\N	f	manual	\N	Default Flow	\N	\N	\N	f	\N	\N	1	2026-02-01 14:05:29.82407+00
76	3	\N	0	\N	\N	t	2026-02-01 14:56:03.802+00	t	f	\N	f	\N	\N	Sena Ecotown Rangsit	\N	{"teamLeadId": 9, "includeTeamLead": true}	[{"level": 1, "logic": "any", "canSkip": false, "approvers": [{"name": "ประสิทธิ์ พัฒนา", "role": "Approver", "userId": "8"}]}, {"level": 2, "logic": "any", "canSkip": false, "approvers": [{"name": "วิภา อนุมัติ", "role": "Approver", "userId": "4"}]}]	f	\N	\N	1	2026-02-01 14:56:03.802+00
75	3	1	0	\N	\N	t	2026-02-01 14:37:45.748+00	t	f	\N	t	specific_user	9	Skip Approval Flow - Sena Ecotown Rangsit - Social Media Post	\N	\N	[]	f	\N	\N	1	2026-02-01 14:56:05.937+00
73	3	101	0	\N	\N	t	2026-02-01 14:37:13.84+00	t	f	\N	t	specific_user	9	Skip Approval Flow - Sena Ecotown Rangsit - Social Media Post (SENX)	\N	\N	[]	f	\N	\N	1	2026-02-01 14:56:06.885+00
72	3	4	0	\N	\N	t	2026-02-01 14:37:12.899+00	t	f	\N	t	specific_user	10	Skip Approval Flow - Sena Ecotown Rangsit - EDM	\N	\N	[]	f	\N	\N	1	2026-02-01 14:56:07.838+00
71	3	6	0	\N	\N	t	2026-02-01 14:37:11.954+00	t	f	\N	t	specific_user	5	Skip Approval Flow - Sena Ecotown Rangsit - Key Visual	\N	\N	[]	f	\N	\N	1	2026-02-01 14:56:08.801+00
70	3	2	0	\N	\N	t	2026-02-01 14:37:11.011+00	t	f	\N	t	specific_user	5	Skip Approval Flow - Sena Ecotown Rangsit - Banner Web	\N	\N	[]	f	\N	\N	1	2026-02-01 14:56:09.848+00
27	8	\N	1	4	\N	t	2026-01-20 18:21:00.921472+00	t	f	\N	f	manual	\N	Default Flow	\N	\N	\N	f	\N	\N	1	2026-02-01 14:05:29.82407+00
51	1	\N	2	4	\N	t	2026-01-27 15:19:40.699341+00	t	f	\N	f	manual	\N	Default Flow	\N	\N	\N	f	\N	\N	1	2026-02-01 14:05:29.82407+00
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approvals (id, tenant_id, job_id, step_number, approver_id, status, comment, approved_at, approval_token, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, tenant_id, user_id, user_email, user_ip, user_agent, action, entity_type, entity_id, entity_name, old_values, new_values, changed_fields, description, metadata, created_at, session_id, request_id) FROM stdin;
1	1	3	somchai@sena.co.th	\N	\N	CREATE	job	23	TEST-001	\N	{"id": 23, "dj_id": "TEST-001", "status": "assigned", "subject": "Overdue Banner Ads", "due_date": "2026-01-26T13:35:46.330191+00:00", "headline": null, "priority": "Urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-24T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 1, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 1, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Overdue Banner Ads	{}	2026-01-26 15:35:46.330191	\N	\N
2	1	2	somying@sena.co.th	\N	\N	CREATE	job	24	TEST-002	\N	{"id": 24, "dj_id": "TEST-002", "status": "in_progress", "subject": "Urgent Content Correction", "due_date": "2026-01-26T18:35:46.330191+00:00", "headline": null, "priority": "Urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-25T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 1, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 2, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Urgent Content Correction	{}	2026-01-26 15:35:46.330191	\N	\N
3	1	2	somying@sena.co.th	\N	\N	CREATE	job	25	TEST-003	\N	{"id": 25, "dj_id": "TEST-003", "status": "assigned", "subject": "Promotion Artwork for Review", "due_date": "2026-01-27T17:35:46.330191+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-26T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 2, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 1, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Promotion Artwork for Review	{}	2026-01-26 15:35:46.330191	\N	\N
4	1	3	somchai@sena.co.th	\N	\N	CREATE	job	26	TEST-004	\N	{"id": 26, "dj_id": "TEST-004", "status": "assigned", "subject": "Monthly Report Design", "due_date": "2026-01-29T15:35:46.330191+00:00", "headline": null, "priority": "Low", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-26T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 3, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Monthly Report Design	{}	2026-01-26 15:35:46.330191	\N	\N
5	1	3	somchai@sena.co.th	\N	\N	CREATE	job	27	TEST-005	\N	{"id": 27, "dj_id": "TEST-005", "status": "correction", "subject": "Brochure Adjustments", "due_date": "2026-01-31T15:35:46.330191+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-23T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 1, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 1, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Brochure Adjustments	{}	2026-01-26 15:35:46.330191	\N	\N
6	1	2	somying@sena.co.th	\N	\N	CREATE	job	28	TEST-006	\N	{"id": 28, "dj_id": "TEST-006", "status": "pending_approval", "subject": "Waiting for Approval Job", "due_date": "2026-01-30T15:35:46.330191+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-25T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 2, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 1, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Waiting for Approval Job	{}	2026-01-26 15:35:46.330191	\N	\N
7	1	2	somying@sena.co.th	\N	\N	CREATE	job	29	TEST-007	\N	{"id": 29, "dj_id": "TEST-007", "status": "completed", "subject": "Completed Logo Design", "due_date": "2026-01-24T15:35:46.330191+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-01-21T15:35:46.330191+00:00", "deleted_at": null, "deleted_by": null, "project_id": 1, "started_at": null, "updated_at": "2026-01-26T15:35:46.330191+00:00", "assignee_id": 5, "description": null, "final_files": [], "job_type_id": 2, "cancelled_by": null, "completed_at": "2026-01-25T15:35:46.330191+00:00", "completed_by": null, "requester_id": 2, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: Completed Logo Design	{}	2026-01-26 15:35:46.330191	\N	\N
18	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	1	DJ-2026-001	{"id": 1, "dj_id": "DJ-2026-001", "status": "completed", "subject": "Banner Facebook Q1 Campaign", "due_date": "2026-01-10T17:00:00+00:00", "headline": "รับส่วนลดพิเศษ 10% ทุกยูนิต", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำแบนเนอร์โปรโมชั่น Q1 สำหรับ Facebook Ads", "tenant_id": 1, "created_at": "2026-01-05T09:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "เฉพาะลูกค้าที่จองภายในมกราคม 2026", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
19	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	3	DJ-2026-003	{"id": 3, "dj_id": "DJ-2026-003", "status": "pending_approval", "subject": "Carousel Post Instagram", "due_date": "2026-01-17T17:00:00+00:00", "headline": "5 เหตุผลที่ควรซื้อบ้าน Ecotown", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำคอนเทนต์ Carousel 5 สไลด์ สำหรับ Instagram โปรฯอีโคทาวน์", "tenant_id": 1, "created_at": "2026-01-12T08:30:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "สิ่งแวดล้อมดี ชีวิตดีขึ้น", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
20	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	7	DJ-2026-007	{"id": 7, "dj_id": "DJ-2026-007", "status": "draft", "subject": "Facebook Cover Photo", "due_date": "2026-02-02T15:36:05.646787+00:00", "headline": "February Love Campaign", "priority": "low", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Cover Photo Facebook สำหรับเดือนกุมภาพันธ์", "tenant_id": 1, "created_at": "2026-01-13T16:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "รักใคร ให้บ้าน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
21	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	2	DJ-2026-002	{"id": 2, "dj_id": "DJ-2026-002", "status": "in_progress", "subject": "Brochure โครงการใหม่", "due_date": "2026-01-25T15:36:05.646787+00:00", "headline": "Sena Villa Ratchapruek", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบโบรชัวร์โครงการใหม่ Sena Villa ฉบับภาษาไทย", "tenant_id": 1, "created_at": "2026-01-10T10:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": "2026-01-10T10:00:00+00:00", "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "บ้านเดี่ยว 4 ห้องนอน พร้อมสวนหน้าบ้าน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
22	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	4	DJ-2026-004	{"id": 4, "dj_id": "DJ-2026-004", "status": "review", "subject": "VDO Walkthrough โครงการ", "due_date": "2026-01-20T17:00:00+00:00", "headline": "Park Grand House Tour", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ถ่าย VDO Walkthrough บ้านตัวอย่าง พร้อม Voice Over", "tenant_id": 1, "created_at": "2026-01-08T11:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 10, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ชมบ้านตัวอย่างพร้อมแต่งครบ", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
23	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	5	DJ-2026-005	{"id": 5, "dj_id": "DJ-2026-005", "status": "approved", "subject": "LINE Rich Menu", "due_date": "2026-01-18T17:00:00+00:00", "headline": "Villa Pinklao Menu", "priority": "high", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Rich Menu สำหรับ LINE OA โครงการ Villa Pinklao", "tenant_id": 1, "created_at": "2026-01-11T14:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ดูแบบบ้าน / ราคา / ติดต่อ", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
24	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	6	DJ-2026-006	{"id": 6, "dj_id": "DJ-2026-006", "status": "rejected", "subject": "Billboard ทางด่วน", "due_date": "2026-01-14T17:00:00+00:00", "headline": "Ecotown Rangsit", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Billboard ขนาด 6x3 เมตร ติดทางด่วน", "tenant_id": 1, "created_at": "2026-01-09T09:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "บ้านเดี่ยว เริ่ม 2.9 ล้าน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
25	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	9	DJ-2026-009	{"id": 9, "dj_id": "DJ-2026-009", "status": "pending_approval", "subject": "Backdrop งาน Grand Opening", "due_date": "2026-01-25T17:00:00+00:00", "headline": "Grand Opening Ecotown", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Backdrop งาน Grand Opening ขนาด 6x3 เมตร", "tenant_id": 1, "created_at": "2026-01-10T13:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "วันที่ 1 กุมภาพันธ์ 2026", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
26	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	10	DJ-2026-010	{"id": 10, "dj_id": "DJ-2026-010", "status": "completed", "subject": "Flyer A5 แจกตามงาน", "due_date": "2026-01-12T17:00:00+00:00", "headline": "Park Grand - Your Dream Home", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Flyer ขนาด A5 สำหรับแจกในงาน Property Expo", "tenant_id": 1, "created_at": "2026-01-06T08:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ส่วนลดพิเศษในงาน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
27	1	3	somchai@sena.co.th	\N	\N	HARD_DELETE	job	12	DJ-2026-012	{"id": 12, "dj_id": "DJ-2026-012", "status": "review", "subject": "Email Newsletter Template", "due_date": "2026-01-20T17:00:00+00:00", "headline": "Ecotown Monthly Update", "priority": "low", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "สร้าง Email Template สำหรับส่ง Newsletter รายเดือน", "tenant_id": 1, "created_at": "2026-01-13T11:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": "โปรโมชั่นและข่าวสารล่าสุด", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
28	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	8	DJ-2026-008	{"id": 8, "dj_id": "DJ-2026-008", "status": "in_progress", "subject": "Google Ads Banner 5 Size", "due_date": "2026-01-22T17:00:00+00:00", "headline": "Villa Ratchapruek Grand Opening", "priority": "high", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำ Google Display Ads 5 ขนาด (300x250, 728x90, 160x600, 300x600, 970x90)", "tenant_id": 1, "created_at": "2026-01-14T10:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": "2026-01-14T10:00:00+00:00", "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "พิเศษ! ลดสูงสุด 500,000 บาท", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
29	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	13	DJ-2026-013	{"id": 13, "dj_id": "DJ-2026-013", "status": "in_progress", "subject": "Instagram Story Series (5 ชิ้น)", "due_date": "2026-01-19T17:00:00+00:00", "headline": "Park Grand Story Series", "priority": "high", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำคอนเทนต์ Instagram Story 5 ชิ้น เล่าเรื่องโครงการ", "tenant_id": 1, "created_at": "2026-01-16T10:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": "2026-01-16T10:00:00+00:00", "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ตอนที่ 1-5: จากแนวคิดสู่ความจริง", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
30	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	11	DJ-2026-011	{"id": 11, "dj_id": "DJ-2026-011", "status": "assigned", "subject": "TikTok Short Video 15s", "due_date": "2026-01-25T15:36:05.646787+00:00", "headline": "#VillaPinklao #DreamHome", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ถ่าย TikTok วิดีโอสั้น 15 วินาที โชว์จุดเด่นบ้าน", "tenant_id": 1, "created_at": "2026-01-15T09:30:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": 10, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ทำเลดี ใกล้ MRT", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
31	1	3	somchai@sena.co.th	\N	\N	HARD_DELETE	job	14	DJ-2026-014	{"id": 14, "dj_id": "DJ-2026-014", "status": "completed", "subject": "Name Card พนักงานขาย", "due_date": "2026-01-14T17:00:00+00:00", "headline": "Villa Ratchapruek Sales Team", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบนามบัตรพนักงานขายใหม่ 10 คน", "tenant_id": 1, "created_at": "2026-01-07T14:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": "ติดต่อเรา", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
32	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	15	DJ-2026-015	{"id": 15, "dj_id": "DJ-2026-015", "status": "pending_approval", "subject": "YouTube Thumbnail 3 ชิ้น", "due_date": "2026-01-21T17:00:00+00:00", "headline": "Ecotown Review Series", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำ Thumbnail YouTube 3 ชิ้น สำหรับคลิปรีวิวโครงการ", "tenant_id": 1, "created_at": "2026-01-14T13:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "รีวิวจริงจากเจ้าของบ้าน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
33	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	16	DJ-2026-016	{"id": 16, "dj_id": "DJ-2026-016", "status": "approved", "subject": "Standee โปรโมชั่น", "due_date": "2026-01-23T17:00:00+00:00", "headline": "โปรมกราคมนี้เท่านั้น!", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ออกแบบ Standee ขนาด 60x160 ซม. จำนวน 3 แบบ", "tenant_id": 1, "created_at": "2026-01-16T15:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "รับฟรี! เฟอร์นิเจอร์ครบชุด", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
34	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	17	DJ-2026-017	{"id": 17, "dj_id": "DJ-2026-017", "status": "rework", "subject": "Facebook Carousel Ads", "due_date": "2026-01-18T17:00:00+00:00", "headline": "5 Reasons to Choose Villa", "priority": "high", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ทำ Carousel Ads 5 ภาพ สำหรับ Facebook", "tenant_id": 1, "created_at": "2026-01-12T10:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ทำเล ดีไซน์ ราคา คุณภาพ บริการ", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
35	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	19	DJ-2026-019	{"id": 19, "dj_id": "DJ-2026-019", "status": "overdue", "subject": "Poster A2 แสดงราคา", "due_date": "2026-01-13T17:00:00+00:00", "headline": "รายการราคา Park Grand", "priority": "urgent", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "โปสเตอร์แสดงราคาบ้านทุกแบบ สำหรับติดในสำนักงานขาย", "tenant_id": 1, "created_at": "2026-01-08T09:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-20T10:56:08.186424+00:00", "assigned_at": null, "assignee_id": 5, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "ราคาเริ่มต้น 4.5 ล้าน", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
36	1	2	somying@sena.co.th	\N	\N	HARD_DELETE	job	20	DJ-2026-020	{"id": 20, "dj_id": "DJ-2026-020", "status": "draft", "subject": "TikTok Content Plan มกราคม", "due_date": "2026-02-02T15:36:05.646787+00:00", "headline": "January TikTok Series", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "วางแผนคอนเทนต์ TikTok 10 คลิป สำหรับเดือนมกราคม", "tenant_id": 1, "created_at": "2026-01-17T10:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": null, "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 2, "sub_headline": "เทรนด์ปีใหม่", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
37	1	3	somchai@sena.co.th	\N	\N	HARD_DELETE	job	18	DJ-2026-018	{"id": 18, "dj_id": "DJ-2026-018", "status": "in_progress", "subject": "Drone Footage โครงการ", "due_date": "2026-01-28T17:00:00+00:00", "headline": "Ecotown Aerial View", "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": "ถ่าย Drone ภาพรวมโครงการและบริเวณโดยรอบ", "tenant_id": 1, "created_at": "2026-01-15T08:00:00+00:00", "deleted_at": null, "deleted_by": null, "project_id": null, "started_at": "2026-01-15T08:00:00+00:00", "updated_at": "2026-01-26T15:36:05.646787+00:00", "assigned_at": null, "assignee_id": 14, "description": null, "final_files": [], "job_type_id": null, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 3, "sub_headline": "มุมสูงของโครงการสีเขียว", "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	\N	Job permanently deleted	{}	2026-01-28 09:28:53.805222	\N	\N
38	1	9999	admin@example.com	\N	\N	CREATE	user	9999	admin@example.com	\N	{"email": "admin@example.com", "is_active": true, "last_name": "Admin", "first_name": "Real"}	\N	User account created	{}	2026-01-28 14:39:23.836814	\N	\N
49	2	10000	admin@test.com	\N	\N	CREATE	user	10000	admin@test.com	\N	{"email": "admin@test.com", "is_active": true, "last_name": "System", "first_name": "Admin"}	\N	User account created	{}	2026-01-30 09:51:20.580762	\N	\N
50	2	10001	manager@test.com	\N	\N	CREATE	user	10001	manager@test.com	\N	{"email": "manager@test.com", "is_active": true, "last_name": "Test", "first_name": "Manager"}	\N	User account created	{}	2026-01-30 09:53:27.910541	\N	\N
51	2	10002	designer@test.com	\N	\N	CREATE	user	10002	designer@test.com	\N	{"email": "designer@test.com", "is_active": true, "last_name": "Test", "first_name": "Designer"}	\N	User account created	{}	2026-01-30 09:53:29.972905	\N	\N
52	2	10003	requester@test.com	\N	\N	CREATE	user	10003	requester@test.com	\N	{"email": "requester@test.com", "is_active": true, "last_name": "Test", "first_name": "Requester"}	\N	User account created	{}	2026-01-30 09:53:31.943071	\N	\N
53	1	\N	\N	\N	\N	UPDATE_MANAGER	department	4	\N	\N	{"reason": "Manual Assignment via User Management", "newDepartmentId": 10, "previousDepartments": []}	\N	\N	{}	2026-02-02 10:47:25.494	\N	\N
54	2	10004	approver1@test.com	\N	\N	CREATE	user	10004	approver1@test.com	\N	{"email": "approver1@test.com", "is_active": true, "last_name": "Test", "first_name": "Approver1"}	\N	User account created	{}	2026-02-03 02:27:47.883829	\N	\N
55	2	10005	approver2@test.com	\N	\N	CREATE	user	10005	approver2@test.com	\N	{"email": "approver2@test.com", "is_active": true, "last_name": "Test", "first_name": "Approver2"}	\N	User account created	{}	2026-02-03 02:27:49.890229	\N	\N
56	2	10006	approver3@test.com	\N	\N	CREATE	user	10006	approver3@test.com	\N	{"email": "approver3@test.com", "is_active": true, "last_name": "Test", "first_name": "Approver3"}	\N	User account created	{}	2026-02-03 02:27:51.907129	\N	\N
57	2	10007	requester1@test.com	\N	\N	CREATE	user	10007	requester1@test.com	\N	{"email": "requester1@test.com", "is_active": true, "last_name": "Test", "first_name": "Requester1"}	\N	User account created	{}	2026-02-03 02:27:53.903435	\N	\N
58	2	10008	requester2@test.com	\N	\N	CREATE	user	10008	requester2@test.com	\N	{"email": "requester2@test.com", "is_active": true, "last_name": "Test", "first_name": "Requester2"}	\N	User account created	{}	2026-02-03 02:27:56.211246	\N	\N
59	2	10009	assignee1@test.com	\N	\N	CREATE	user	10009	assignee1@test.com	\N	{"email": "assignee1@test.com", "is_active": true, "last_name": "Test", "first_name": "Assignee1"}	\N	User account created	{}	2026-02-03 02:27:58.802537	\N	\N
60	2	10010	assignee2@test.com	\N	\N	CREATE	user	10010	assignee2@test.com	\N	{"email": "assignee2@test.com", "is_active": true, "last_name": "Test", "first_name": "Assignee2"}	\N	User account created	{}	2026-02-03 02:28:01.63867	\N	\N
61	2	10011	assignee3@test.com	\N	\N	CREATE	user	10011	assignee3@test.com	\N	{"email": "assignee3@test.com", "is_active": true, "last_name": "Test", "first_name": "Assignee3"}	\N	User account created	{}	2026-02-03 02:28:04.098851	\N	\N
62	2	10012	assignee4@test.com	\N	\N	CREATE	user	10012	assignee4@test.com	\N	{"email": "assignee4@test.com", "is_active": true, "last_name": "Test", "first_name": "Assignee4"}	\N	User account created	{}	2026-02-03 02:28:06.061013	\N	\N
67	1	1	admin@sena.co.th	\N	\N	CREATE	job	34	DJ-2026-0006	\N	{"id": 34, "dj_id": "DJ-2026-0006", "status": "pending_approval", "subject": "ทดสอบการสร้าง1", "due_date": "2026-02-03T06:50:46.484+00:00", "headline": null, "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": true, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T06:50:46.608962+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T06:50:46.608962+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 102, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1	{}	2026-02-03 06:50:46.608962	\N	\N
68	1	1	admin@sena.co.th	\N	\N	CREATE	job	35	DJ-2026-0007	\N	{"id": 35, "dj_id": "DJ-2026-0007", "status": "pending_approval", "subject": "ทดสอบการสร้าง1", "due_date": "2026-02-03T07:04:03.745+00:00", "headline": null, "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": true, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:04:03.88508+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:04:03.88508+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 102, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1	{}	2026-02-03 07:04:03.88508	\N	\N
69	1	1	admin@sena.co.th	\N	\N	CREATE	job	36	DJ-2026-0008	\N	{"id": 36, "dj_id": "DJ-2026-0008", "status": "pending_approval", "subject": "ทดสอบการสร้าง1", "due_date": "2026-02-03T07:04:14.396+00:00", "headline": null, "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": true, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:04:14.533949+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:04:14.533949+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 102, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1	{}	2026-02-03 07:04:14.533949	\N	\N
70	1	1	admin@sena.co.th	\N	\N	CREATE	job	37	DJ-2026-0009	\N	{"id": 37, "dj_id": "DJ-2026-0009", "status": "pending_approval", "subject": "ทดสอบการสร้าง1", "due_date": "2026-02-03T07:15:37.925+00:00", "headline": null, "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": true, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:15:38.066629+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:15:38.066629+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 102, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1	{}	2026-02-03 07:15:38.066629	\N	\N
71	1	1	admin@sena.co.th	\N	\N	CREATE	job	38	DJ-2026-0010	\N	{"id": 38, "dj_id": "DJ-2026-0010", "status": "pending_approval", "subject": "ทดสอบการสร้าง1", "due_date": "2026-02-03T07:16:51.862+00:00", "headline": null, "priority": "normal", "closed_at": null, "closed_by": null, "is_parent": true, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:16:52.006874+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:16:52.006874+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 102, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": null, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1	{}	2026-02-03 07:16:52.006874	\N	\N
72	1	1	admin@sena.co.th	\N	\N	CREATE	job	39	DJ-2026-0011	\N	{"id": 39, "dj_id": "DJ-2026-0011", "status": "pending_approval", "subject": "ทดสอบการสร้าง1 - Child #1", "due_date": "2026-02-09T07:16:53.541+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:16:53.686511+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:16:53.686511+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 1, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": 38, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1 - Child #1	{}	2026-02-03 07:16:53.686511	\N	\N
73	1	1	admin@sena.co.th	\N	\N	CREATE	job	40	DJ-2026-0012	\N	{"id": 40, "dj_id": "DJ-2026-0012", "status": "pending_approval", "subject": "ทดสอบการสร้าง1 - Child #2", "due_date": "2026-02-12T07:16:54.219+00:00", "headline": null, "priority": "Normal", "closed_at": null, "closed_by": null, "is_parent": false, "objective": null, "tenant_id": 1, "created_at": "2026-02-03T07:16:54.373628+00:00", "deleted_at": null, "deleted_by": null, "project_id": 3, "started_at": null, "updated_at": "2026-02-03T07:16:54.373628+00:00", "assigned_at": null, "assignee_id": null, "description": null, "final_files": [], "job_type_id": 5, "cancelled_by": null, "completed_at": null, "completed_by": null, "requester_id": 1, "sub_headline": null, "artwork_count": 1, "cancel_reason": null, "parent_job_id": 38, "original_due_date": null, "shifted_by_job_id": null, "close_requested_at": null, "close_requested_by": null, "auto_approved_levels": []}	\N	Job created: ทดสอบการสร้าง1 - Child #2	{}	2026-02-03 07:16:54.373628	\N	\N
\.


--
-- Data for Name: buds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buds (id, tenant_id, name, code, is_active, created_at, description) FROM stdin;
4	1	BUD1-สายงานขาย	BUD1	t	2026-01-30 02:28:27.809+00	\N
2	1	BUD2-สายงานขาย	BUD2	t	2026-01-20 10:56:07.004664+00	\N
5	1	Marcom	Marcom	t	2026-01-30 08:36:18.554+00	\N
3	1	SENX Digital	SENX-D	t	2026-01-20 10:56:07.004664+00	\N
1	1	Senx PM	Senx PM	t	2026-01-20 10:56:07.004664+00	\N
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, tenant_id, bud_id, name, code, manager_id, is_active, created_at, description, updated_at) FROM stdin;
1	1	1	แผนกการตลาด	MKT	\N	t	2026-01-20 10:57:02.106346+00	\N	2026-01-30 08:35:22.552+00
6	1	5	แผนก Online Ads	ADS	\N	t	2026-01-20 10:57:02.106346+00	\N	2026-01-30 08:36:30.835+00
5	1	5	แผนก Website	WEB	\N	t	2026-01-20 10:57:02.106346+00	\N	2026-01-30 08:36:37.835+00
4	1	5	แผนกกราฟฟิค	GFX	\N	t	2026-01-20 10:57:02.106346+00	\N	2026-01-30 08:37:02.46+00
8	1	2	BUD2 Marketing	BUD2 Marketing	\N	t	2026-01-27 14:14:22.952946+00	\N	2026-02-02 02:59:57.98+00
3	1	5	ฝ่าย Digital Content	Content	\N	t	2026-01-20 10:57:02.106346+00	\N	2026-02-02 03:00:35.484+00
10	1	4	BUD1 Marketing	BUD1 Marketing	4	t	2026-01-27 14:14:22.952946+00	\N	2026-02-02 10:47:25.304+00
9	1	\N	Social Media Team	SOCIAL	\N	t	2026-01-27 14:14:22.952946+00	\N	2026-01-30 03:44:08.223+00
\.


--
-- Data for Name: design_job_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.design_job_items (id, job_id, job_type_item_id, name, quantity, status, file_path) FROM stdin;
\.


--
-- Data for Name: design_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.design_jobs (id, tenant_id, dj_id, subject, brief, priority, status, requester_id, assignee_id, job_type_id, deadline, submitted_at, assigned_at, completed_at, created_at, updated_at) FROM stdin;
4	1	DJ-2026-004	Job รออนุมัติ (Pending Approval)	รอหัวหน้าอนุมัติ	low	pending_approval	13	\N	1	2026-02-04 06:39:20.711	\N	\N	\N	2026-01-28 06:39:20.711	2026-02-04 06:40:30.569444
3	1	DJ-2026-003	แก้งาน Artwork (Rework)	แก้ไขสีตามคอมเม้น	urgent	rework	13	5	1	2026-01-29 06:39:20.711	\N	\N	\N	2026-01-25 06:39:20.711	2026-02-04 06:40:38.477902
2	1	DJ-2026-002	ออกแบบ Banner หน้าเว็บ (In Progress)	Banner สำหรับหน้าแรก	normal	in_progress	13	5	1	2026-01-31 06:39:20.711	\N	\N	\N	2026-01-27 06:39:20.711	2026-02-04 06:40:42.658296
1	1	DJ-2026-001	ทำป้ายโฆษณา Facebook (Overdue)	รายละเอียดงานด่วนมาก	urgent	assigned	13	5	1	2026-01-26 06:39:20.711	\N	\N	\N	2026-01-23 06:39:20.711	2026-02-04 06:40:46.931025
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, tenant_id, name, date, type, is_recurring, created_at, updated_at) FROM stdin;
2	1	วันพืชมงคล (Royal Ploughing Ceremony)	2026-05-11	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
3	1	วันหยุดชดเชยวันสิ้นปี (New Years Eve Substitution)	2026-01-02	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
4	1	วันสงกรานต์ (Songkran Festival)	2026-04-15	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
5	1	วันแรงงานแห่งชาติ (National Labour Day)	2026-05-01	company	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
6	1	วันสงกรานต์ (Songkran Festival)	2026-04-13	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
7	1	วันสิ้นปี (New Years Eve)	2026-12-31	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
8	1	วันหยุดชดเชยวันพ่อแห่งชาติ	2026-12-07	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
9	1	วันรัฐธรรมนูญ (Constitution Day)	2026-12-10	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
10	1	วันอาสาฬหบูชา (Asalha Bucha Day)	2026-07-29	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
11	1	วันเข้าพรรษา (Buddhist Lent Day)	2026-07-30	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
12	1	วันสงกรานต์ (Songkran Festival)	2026-04-14	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
13	1	วันคล้ายวันสวรรคต ร.9	2026-10-13	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
14	1	วันวิสาขบูชา (Visakha Bucha Day)	2026-05-31	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
15	1	วันเฉลิมพระชนมพรรษา ร.10 (H.M. King Maha Vajiralongkorns Birthday)	2026-07-28	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
16	1	วันฉัตรมงคล (Coronation Day)	2026-05-04	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
17	1	วันหยุดชดเชยวันวิสาขบูชา	2026-06-01	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
18	1	วันเฉลิมฯ พระพันปีหลวง (Mother Day)	2026-08-12	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
19	1	วันปิยมหาราช (Chulalongkorn Day)	2026-10-23	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
20	1	วันขึ้นปีใหม่ (New Years Day)	2026-01-01	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
21	1	วันเฉลิมพระชนมพรรษาพระราชินี (H.M. Queen Suthidas Birthday)	2026-06-03	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
22	1	วันจักรี (Chakri Memorial Day)	2026-04-06	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
23	1	วันพ่อแห่งชาติ (Father Day)	2026-12-05	government	t	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
24	1	วันมาฆบูชา (Makha Bucha Day)	2026-03-03	government	f	2026-01-26 14:58:20.176361+00	2026-01-26 14:58:20.176361+00
25	1	sena	2026-01-15	company	f	2026-01-28 16:14:55.671+00	2026-01-29 15:04:26.973335+00
\.


--
-- Data for Name: job_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_activities (id, tenant_id, job_id, user_id, activity_type, description, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: job_type_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_type_items (id, job_type_id, name, default_size, is_required, sort_order) FROM stdin;
2	1	Instagram Post	1080x1080px	f	0
3	1	Instagram Story	1080x1920px	f	0
4	1	LINE OA	1040x1040px	f	0
5	2	Homepage Banner	1920x600px	f	0
6	2	Sidebar Banner	300x250px	f	0
7	3	Billboard	4x12m	f	0
8	3	A4 Flyer	21x29.7cm	f	0
9	3	Test Sub Item 3	1920x1080	f	0
1	1	Facebook Post	1080x1080px	f	0
10	5	Youtube HD	1080x720	f	0
16	1	Test Item Valid	1080x1080	f	1
17	101	test	test	f	0
18	101	test2	test2	f	1
19	101	test3	test3	f	2
26	4	EDM	-	f	0
\.


--
-- Data for Name: job_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_types (id, tenant_id, name, description, sla_days, icon, color_theme, is_active, attachments, default_requires_approval, default_levels, default_assignee_id) FROM stdin;
3	1	Print Ad		5	social	\N	t	{Logo,"Product Image","Print Spec",Reference}	t	[]	\N
101	1	Social Media Post (SENX)	สำหรับกลุ่ม Senx	4	social	\N	t	{"Size Spec","Product Image",Logo}	t	[]	\N
6	1	Key Visual		5	social	\N	t	{"Mood & Tone",Reference}	t	[]	\N
102	1	Project Group (Parent)	\N	0	\N	\N	t	\N	t	[]	\N
4	1	EDM		2	social	\N	t	{"Product Image",Logo,"Size Spec",Storyboard,Reference}	t	[]	\N
5	1	Video Clip		7	social	\N	t	{Logo,"Product Image",Script,Storyboard,"Music Ref"}	t	[]	\N
1	1	Social Media Post		4	social	\N	t	{Logo,"Product Image","Size Spec"}	t	[]	\N
2	1	Banner Web		3	social	\N	t	{Logo,"Product Image","Size Spec"}	t	[]	\N
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, tenant_id, project_id, job_type_id, dj_id, subject, objective, description, headline, sub_headline, status, priority, requester_id, assignee_id, due_date, started_at, completed_at, close_requested_at, closed_at, close_requested_by, closed_by, created_at, updated_at, original_due_date, shifted_by_job_id, artwork_count, cancel_reason, cancelled_by, auto_approved_levels, completed_by, final_files, parent_job_id, is_parent, deleted_at, deleted_by, assigned_at) FROM stdin;
37	1	3	102	DJ-2026-0009	ทดสอบการสร้าง1	\N	\N	\N	\N	pending_approval	normal	1	\N	2026-02-03 07:15:37.925+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:15:38.066629+00	2026-02-03 07:15:38.066629+00	\N	\N	1	\N	\N	[]	\N	[]	\N	t	\N	\N	\N
34	1	3	102	DJ-2026-0006	ทดสอบการสร้าง1	\N	\N	\N	\N	pending_approval	normal	1	\N	2026-02-03 06:50:46.484+00	\N	\N	\N	\N	\N	\N	2026-02-03 06:50:46.608962+00	2026-02-03 06:50:46.608962+00	\N	\N	1	\N	\N	[]	\N	[]	\N	t	\N	\N	\N
39	1	3	1	DJ-2026-0011	ทดสอบการสร้าง1 - Child #1	\N	\N	\N	\N	pending_approval	Normal	1	\N	2026-02-09 07:16:53.541+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:16:53.686511+00	2026-02-03 07:16:53.686511+00	\N	\N	1	\N	\N	[]	\N	[]	38	f	\N	\N	\N
40	1	3	5	DJ-2026-0012	ทดสอบการสร้าง1 - Child #2	\N	\N	\N	\N	pending_approval	Normal	1	\N	2026-02-12 07:16:54.219+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:16:54.373628+00	2026-02-03 07:16:54.373628+00	\N	\N	1	\N	\N	[]	\N	[]	38	f	\N	\N	\N
38	1	3	102	DJ-2026-0010	ทดสอบการสร้าง1	\N	\N	\N	\N	pending_approval	normal	1	\N	2026-02-12 07:16:54.219+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:16:52.006874+00	2026-02-03 07:16:54.742118+00	\N	\N	1	\N	\N	[]	\N	[]	\N	t	\N	\N	\N
35	1	3	102	DJ-2026-0007	ทดสอบการสร้าง1	\N	\N	\N	\N	pending_approval	normal	1	\N	2026-02-03 07:04:03.745+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:04:03.88508+00	2026-02-03 07:04:03.88508+00	\N	\N	1	\N	\N	[]	\N	[]	\N	t	\N	\N	\N
36	1	3	102	DJ-2026-0008	ทดสอบการสร้าง1	\N	\N	\N	\N	pending_approval	normal	1	\N	2026-02-03 07:04:14.396+00	\N	\N	\N	\N	\N	\N	2026-02-03 07:04:14.533949+00	2026-02-03 07:04:14.533949+00	\N	\N	1	\N	\N	[]	\N	[]	\N	t	\N	\N	\N
23	1	1	1	TEST-001	Overdue Banner Ads	\N	\N	\N	\N	assigned	Urgent	3	5	2026-01-26 13:35:46.330191+00	\N	\N	\N	\N	\N	\N	2026-01-24 15:35:46.330191+00	2026-01-26 15:35:46.330191+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
27	1	1	1	TEST-005	Brochure Adjustments	\N	\N	\N	\N	correction	Normal	3	5	2026-01-31 15:35:46.330191+00	\N	\N	\N	\N	\N	\N	2026-01-23 15:35:46.330191+00	2026-01-26 15:35:46.330191+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
28	1	2	1	TEST-006	Waiting for Approval Job	\N	\N	\N	\N	pending_approval	Normal	2	5	2026-01-30 15:35:46.330191+00	\N	\N	\N	\N	\N	\N	2026-01-25 15:35:46.330191+00	2026-01-26 15:35:46.330191+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
29	1	1	2	TEST-007	Completed Logo Design	\N	\N	\N	\N	completed	Normal	2	5	2026-01-24 15:35:46.330191+00	\N	2026-01-25 15:35:46.330191+00	\N	\N	\N	\N	2026-01-21 15:35:46.330191+00	2026-01-26 15:35:46.330191+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
21	1	1	3	DJ-2026-0004	ทดสอบ FB Campaign1	\N	\N	\N	\N	pending_approval	Normal	1	\N	2026-02-02 15:36:05.646787+00	\N	\N	\N	\N	\N	\N	2026-01-21 09:01:57.744553+00	2026-01-26 15:36:05.646787+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
22	1	1	1	DJ-2026-0005	ทดสอบ FB Campaign1	\N	\N	\N	\N	in_progress	Normal	1	13	2026-02-02 15:36:05.646787+00	2026-01-23 11:04:04.019+00	\N	\N	\N	\N	\N	2026-01-21 10:37:39.37511+00	2026-01-26 15:36:05.646787+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
24	1	1	2	TEST-002	Urgent Content Correction	\N	\N	\N	\N	in_progress	Urgent	2	5	2026-01-26 18:35:46.330191+00	2026-01-25 15:35:46.330191+00	\N	\N	\N	\N	\N	2026-01-25 15:35:46.330191+00	2026-01-26 15:36:05.646787+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
26	1	3	3	TEST-004	Monthly Report Design	\N	\N	\N	\N	assigned	Low	3	5	2026-01-26 18:36:05.646787+00	\N	\N	\N	\N	\N	\N	2026-01-26 15:35:46.330191+00	2026-01-26 15:36:05.646787+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
25	1	2	1	TEST-003	Promotion Artwork for Review	\N	\N	\N	\N	assigned	Normal	2	5	2026-01-26 18:36:05.646787+00	\N	\N	\N	\N	\N	\N	2026-01-26 15:35:46.330191+00	2026-01-26 15:36:05.646787+00	\N	\N	1	\N	\N	[]	\N	[]	\N	f	\N	\N	\N
\.


--
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_files (id, tenant_id, job_id, project_id, file_name, file_path, file_size, file_type, mime_type, uploaded_by, created_at, thumbnail_path, download_count) FROM stdin;
\.


--
-- Data for Name: notification_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_logs (id, job_id, event_type, recipient_type, recipient_email, recipient_user_id, subject, body, status, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, job_id, link, is_read, metadata, created_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: password_reset_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_requests (id, user_id, otp_code, otp_expires_at, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_flow_approvers_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_flow_approvers_archive (id, assignment_id, level, approver_id, is_active, created_at, archived_at) FROM stdin;
\.


--
-- Data for Name: project_flow_assignments_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_flow_assignments_archive (id, tenant_id, project_id, job_type_id, template_id, override_auto_assign, auto_assign_type, auto_assign_user_id, is_active, created_at, archived_at) FROM stdin;
1	2	5	1	10	f	\N	\N	t	2026-01-29 07:37:51.45+00	2026-01-31 16:37:39.900354+00
2	2	5	\N	11	f	\N	\N	t	2026-01-29 07:37:55.091+00	2026-01-31 16:37:39.900354+00
\.


--
-- Data for Name: project_job_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_job_assignments (id, project_id, job_type_id, assignee_id, is_active, created_at, updated_at) FROM stdin;
1	8	1	6	t	2026-01-20 18:20:44.685742+00	2026-01-20 18:20:44.553+00
3	8	5	14	t	2026-01-20 18:20:44.685742+00	2026-01-20 18:20:44.553+00
2	8	2	10	t	2026-01-20 18:20:44.685742+00	2026-01-20 18:20:53.494+00
21	1	4	6	t	2026-01-21 08:11:38.330874+00	2026-01-26 11:01:35.976+00
5	1	3	5	t	2026-01-20 18:27:49.236794+00	2026-01-27 14:19:58.124+00
14	1	1	14	t	2026-01-21 00:39:26.451927+00	2026-01-27 14:19:58.126+00
17	1	5	10	t	2026-01-21 00:39:37.702782+00	2026-01-27 14:19:58.126+00
22	1	2	6	t	2026-01-21 08:11:38.330874+00	2026-01-27 14:19:58.126+00
23	1	6	10	t	2026-01-21 08:11:38.330874+00	2026-01-27 14:19:58.126+00
24	1	101	5	t	2026-01-21 08:11:38.330874+00	2026-01-27 14:19:58.126+00
94	3	2	5	t	2026-01-29 08:46:46.141+00	2026-01-29 08:46:46.141+00
95	3	4	10	t	2026-01-29 08:46:46.557+00	2026-01-29 08:46:46.557+00
96	3	5	10	t	2026-01-29 08:46:46.957+00	2026-01-29 08:46:46.957+00
97	3	101	9	t	2026-01-29 08:46:47.353+00	2026-01-29 08:46:47.353+00
98	3	1	9	t	2026-01-29 08:46:47.743+00	2026-01-29 08:46:47.743+00
99	3	3	5	t	2026-01-29 08:46:48.136+00	2026-01-29 08:46:48.136+00
100	3	6	5	t	2026-01-29 08:46:48.532+00	2026-01-29 08:46:48.532+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, tenant_id, bud_id, department_id, name, code, is_active, created_at) FROM stdin;
7	1	2	\N	Sena Kith Phahonyothin	SKP-PH	t	2026-01-20 10:56:07.803963+00
1	1	4	\N	Sena Park Grand Ratchayothin	SPG-RY	t	2026-01-20 10:56:07.803963+00
4	1	4	\N	Sena Villa Pinklao	SVP	t	2026-01-20 10:56:07.803963+00
2	1	4	\N	Sena Villa Ratchapruek	SVR	t	2026-01-20 10:56:07.803963+00
5	1	4	\N	Sena Haus Sukhumvit	SH-SKV	t	2026-01-20 10:56:07.803963+00
3	1	4	\N	Sena Ecotown Rangsit	SET-ECORS	t	2026-01-20 10:56:07.803963+00
8	1	3	\N	SENX Project 01	SENX01	t	2026-01-20 10:56:07.803963+00
6	1	2	\N	Sena Festive Chiang Mai	SFC-CM	t	2026-01-20 10:56:07.803963+00
\.


--
-- Data for Name: sla_shift_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sla_shift_logs (id, job_id, urgent_job_id, original_due_date, new_due_date, shift_days, created_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, code, subdomain, is_active, created_at, logo_url, primary_color, settings, updated_at) FROM stdin;
1	SENA Development	SENA-D	sena	t	2026-01-20 10:56:06.534987+00	\N	#E11D48	{}	2026-01-30 02:25:33.551774
2	SEN X	SENX	senx	f	2026-01-20 10:56:06.534987+00	\N	#E11D48	{}	2026-01-30 02:25:33.551774
\.


--
-- Data for Name: user_registration_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_registration_requests (id, tenant_id, email, title, first_name, last_name, phone, department, "position", status, rejected_reason, approved_by, created_at, updated_at) FROM stdin;
1	1	chanetw@sena.co.th		ทดสอบลงทะเบียน	OPMH1		การตลาด		pending	\N	\N	2026-01-22 09:39:20.717414	2026-01-22 09:39:20.717414
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, tenant_id, role_name, assigned_by, assigned_at, is_active, created_at, updated_at) FROM stdin;
3	14	1	assignee	1	2026-01-26 10:14:22.904083	t	2026-01-26 10:14:22.904083	2026-01-26 10:14:22.904083
4	13	1	requester	1	2026-01-26 10:49:01.106168	t	2026-01-26 10:49:01.106168	2026-01-26 10:49:01.106168
7	1	1	admin	1	2026-01-28 06:22:10.948334	t	2026-01-28 06:22:10.878	2026-01-28 06:22:10.878
10	9999	1	admin	\N	2026-01-28 14:39:25.757855	t	2026-01-28 14:39:25.685	2026-01-28 14:39:25.685
28	3	1	requester	\N	2026-02-02 02:50:40.253	t	2026-02-02 02:50:40.254	2026-02-02 02:50:40.254
29	6	1	assignee	\N	2026-02-02 02:51:03.189	t	2026-02-02 02:51:03.19	2026-02-02 02:51:03.19
35	10	1	assignee	\N	2026-02-02 04:31:45.858	t	2026-02-02 04:31:45.858	2026-02-02 04:31:45.858
36	2	1	requester	\N	2026-02-02 04:46:00.91	t	2026-02-02 04:46:00.911	2026-02-02 04:46:00.911
37	5	1	assignee	\N	2026-02-02 09:19:15.851	t	2026-02-02 09:19:15.852	2026-02-02 09:19:15.852
38	11	1	requester	\N	2026-02-02 09:19:44.7	t	2026-02-02 09:19:44.701	2026-02-02 09:19:44.701
39	9	1	assignee	\N	2026-02-02 09:20:22.594	t	2026-02-02 09:20:22.594	2026-02-02 09:20:22.594
42	7	1	requester	\N	2026-02-02 09:47:46.013	t	2026-02-02 09:47:46.015	2026-02-02 09:47:46.015
47	4	1	approver	\N	2026-02-02 10:47:23.778	t	2026-02-02 10:47:23.78	2026-02-02 10:47:23.78
48	8	1	approver	\N	2026-02-03 02:09:33.535	t	2026-02-03 02:09:33.537	2026-02-03 02:09:33.537
16	10000	1	admin	\N	2026-01-30 09:53:26.82	t	2026-01-30 09:53:26.826	2026-02-03 02:42:53.253326
17	10001	1	manager	\N	2026-01-30 09:53:28.903	t	2026-01-30 09:53:28.905	2026-02-03 02:42:54.963857
18	10002	1	assignee	\N	2026-01-30 09:53:30.884	t	2026-01-30 09:53:30.885	2026-02-03 02:42:56.04465
19	10003	1	user	\N	2026-01-30 09:53:32.84	t	2026-01-30 09:53:32.841	2026-02-03 02:42:57.057109
49	10004	1	approver	\N	2026-02-03 02:27:48.811	t	2026-02-03 02:27:48.819	2026-02-03 02:42:58.068181
50	10005	1	approver	\N	2026-02-03 02:27:50.844	t	2026-02-03 02:27:50.846	2026-02-03 02:42:59.078933
51	10006	1	approver	\N	2026-02-03 02:27:52.83	t	2026-02-03 02:27:52.831	2026-02-03 02:43:00.092302
52	10007	1	requester	\N	2026-02-03 02:27:54.871	t	2026-02-03 02:27:54.872	2026-02-03 02:43:01.106331
53	10008	1	requester	\N	2026-02-03 02:27:57.316	t	2026-02-03 02:27:57.317	2026-02-03 02:43:02.187349
54	10009	1	assignee	\N	2026-02-03 02:28:00.454	t	2026-02-03 02:28:00.455	2026-02-03 02:43:03.209701
55	10010	1	assignee	\N	2026-02-03 02:28:02.728	t	2026-02-03 02:28:02.729	2026-02-03 02:43:04.22437
56	10011	1	assignee	\N	2026-02-03 02:28:05.028	t	2026-02-03 02:28:05.029	2026-02-03 02:43:05.232632
57	10012	1	assignee	\N	2026-02-03 02:28:06.945	t	2026-02-03 02:28:06.947	2026-02-03 02:43:06.382225
\.


--
-- Data for Name: user_scope_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_scope_assignments (id, user_id, tenant_id, scope_level, scope_id, scope_name, role_type, assigned_by, assigned_at, is_active, created_at, updated_at) FROM stdin;
4	13	1	project	3	Sena Ecotown Rangsit	requester	1	2026-01-26 10:49:01.257906	t	2026-01-26 10:49:01.257906	2026-01-26 10:49:01.257906
5	13	1	project	6	Sena Festive Chiang Mai	requester	1	2026-01-26 10:49:01.257906	t	2026-01-26 10:49:01.257906	2026-01-26 10:49:01.257906
6	13	1	project	5	Sena Haus Sukhumvit	requester	1	2026-01-26 10:49:01.257906	t	2026-01-26 10:49:01.257906	2026-01-26 10:49:01.257906
25	3	1	project	3	Sena Ecotown Rangsit	requester	\N	2026-02-02 02:50:39.750027	t	2026-02-02 02:50:39.750027	2026-02-02 02:50:39.750027
26	3	1	project	5	Sena Haus Sukhumvit	requester	\N	2026-02-02 02:50:39.750027	t	2026-02-02 02:50:39.750027	2026-02-02 02:50:39.750027
27	3	1	project	6	Sena Festive Chiang Mai	requester	\N	2026-02-02 02:50:39.750027	t	2026-02-02 02:50:39.750027	2026-02-02 02:50:39.750027
28	6	1	project	5	Sena Haus Sukhumvit	assignee	\N	2026-02-02 02:51:02.678358	t	2026-02-02 02:51:02.678358	2026-02-02 02:51:02.678358
29	6	1	project	3	Sena Ecotown Rangsit	assignee	\N	2026-02-02 02:51:02.678358	t	2026-02-02 02:51:02.678358	2026-02-02 02:51:02.678358
30	6	1	project	6	Sena Festive Chiang Mai	assignee	\N	2026-02-02 02:51:02.678358	t	2026-02-02 02:51:02.678358	2026-02-02 02:51:02.678358
45	10	1	project	3	Sena Ecotown Rangsit	assignee	\N	2026-02-02 04:31:45.316396	t	2026-02-02 04:31:45.316396	2026-02-02 04:31:45.316396
46	10	1	project	5	Sena Haus Sukhumvit	assignee	\N	2026-02-02 04:31:45.316396	t	2026-02-02 04:31:45.316396	2026-02-02 04:31:45.316396
47	10	1	project	6	Sena Festive Chiang Mai	assignee	\N	2026-02-02 04:31:45.316396	t	2026-02-02 04:31:45.316396	2026-02-02 04:31:45.316396
48	10	1	project	7	Sena Kith Phahonyothin	assignee	\N	2026-02-02 04:31:45.316396	t	2026-02-02 04:31:45.316396	2026-02-02 04:31:45.316396
49	2	1	project	5	Sena Haus Sukhumvit	requester	\N	2026-02-02 04:46:00.380329	t	2026-02-02 04:46:00.380329	2026-02-02 04:46:00.380329
50	2	1	project	3	Sena Ecotown Rangsit	requester	\N	2026-02-02 04:46:00.380329	t	2026-02-02 04:46:00.380329	2026-02-02 04:46:00.380329
51	2	1	project	6	Sena Festive Chiang Mai	requester	\N	2026-02-02 04:46:00.380329	t	2026-02-02 04:46:00.380329	2026-02-02 04:46:00.380329
52	5	1	project	5	Sena Haus Sukhumvit	assignee	\N	2026-02-02 09:19:15.337326	t	2026-02-02 09:19:16.073	2026-02-02 09:19:16.073
53	5	1	project	3	Sena Ecotown Rangsit	assignee	\N	2026-02-02 09:19:15.337326	t	2026-02-02 09:19:16.073	2026-02-02 09:19:16.073
54	5	1	project	6	Sena Festive Chiang Mai	assignee	\N	2026-02-02 09:19:15.337326	t	2026-02-02 09:19:16.073	2026-02-02 09:19:16.073
55	11	1	bud	4	BUD1-สายงานขาย	requester	\N	2026-02-02 09:19:44.196959	t	2026-02-02 09:19:44.896	2026-02-02 09:19:44.896
56	9	1	project	3	Sena Ecotown Rangsit	assignee	\N	2026-02-02 09:20:22.093426	t	2026-02-02 09:20:22.792	2026-02-02 09:20:22.792
57	9	1	project	5	Sena Haus Sukhumvit	assignee	\N	2026-02-02 09:20:22.093426	t	2026-02-02 09:20:22.792	2026-02-02 09:20:22.792
58	9	1	project	1	Sena Park Grand Ratchayothin	assignee	\N	2026-02-02 09:20:22.093426	t	2026-02-02 09:20:22.792	2026-02-02 09:20:22.792
65	7	1	project	3	Sena Ecotown Rangsit	requester	\N	2026-02-02 09:47:45.514992	t	2026-02-02 09:47:46.213	2026-02-02 09:47:46.213
66	7	1	project	5	Sena Haus Sukhumvit	requester	\N	2026-02-02 09:47:45.514992	t	2026-02-02 09:47:46.213	2026-02-02 09:47:46.213
67	7	1	project	6	Sena Festive Chiang Mai	requester	\N	2026-02-02 09:47:45.514992	t	2026-02-02 09:47:46.213	2026-02-02 09:47:46.213
68	7	1	project	4	Sena Villa Pinklao	requester	\N	2026-02-02 09:47:45.514992	t	2026-02-02 09:47:46.213	2026-02-02 09:47:46.213
74	4	1	bud	4	BUD1-สายงานขาย	approver	\N	2026-02-02 10:47:23.291033	t	2026-02-02 10:47:23.989	2026-02-02 10:47:23.989
75	8	1	project	7	Sena Kith Phahonyothin	approver	\N	2026-02-03 02:09:33.014283	t	2026-02-03 02:09:33.766	2026-02-03 02:09:33.766
76	8	1	project	1	Sena Park Grand Ratchayothin	approver	\N	2026-02-03 02:09:33.014283	t	2026-02-03 02:09:33.766	2026-02-03 02:09:33.766
77	8	1	project	2	Sena Villa Ratchapruek	approver	\N	2026-02-03 02:09:33.014283	t	2026-02-03 02:09:33.766	2026-02-03 02:09:33.766
78	8	1	project	5	Sena Haus Sukhumvit	approver	\N	2026-02-03 02:09:33.014283	t	2026-02-03 02:09:33.766	2026-02-03 02:09:33.766
79	8	1	project	3	Sena Ecotown Rangsit	approver	\N	2026-02-03 02:09:33.014283	t	2026-02-03 02:09:33.766	2026-02-03 02:09:33.766
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, tenant_id, department_id, email, first_name, last_name, display_name, role, phone_number, avatar_url, is_active, created_at, title, must_change_password, sso_provider, sso_user_id, deleted_at, deleted_by, department, updated_at, password_hash, roles, status, registered_at, approved_at, approved_by, rejection_reason, last_login_at) FROM stdin;
4	1	10	wipa@sena.co.th	วิภา	อนุมัติ	วิภา อนุมัติ	approver	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 10:47:22.527269		{user}	APPROVED	\N	\N	\N	\N	\N
9999	1	\N	admin@example.com	Real	Admin	Real Admin	admin	\N	\N	t	2026-01-28 14:39:23.763+00	\N	f	\N	\N	\N	\N	\N	2026-01-28 16:19:45.617252	$2b$10$je0dULdI0bzwrSreOzOOsecM2RmH4CKcuD0covMqxDtQ/6jC60j5C	{user}	APPROVED	\N	\N	\N	\N	\N
8	1	10	prasit@sena.co.th	ประสิทธิ์	พัฒนา	ประสิทธิ์ พัฒนา	approver	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:09:32.158962		{user}	APPROVED	\N	\N	\N	\N	\N
6	1	4	pim@sena.co.th	พิม	เว็บ	พิม เว็บ	assignee	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 02:51:01.759597		{user}	APPROVED	\N	\N	\N	\N	\N
1	1	\N	admin@sena.co.th	Admin	System	System Admin	admin	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-01-26 10:32:56.586885		{user}	APPROVED	\N	\N	\N	\N	\N
10	1	10	thanakorn@sena.co.th	ธนากร	วิดีโอ	ธนากร วิดีโอ	assignee	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 04:31:44.547987		{user}	APPROVED	\N	\N	\N	\N	\N
2	1	10	somying@sena.co.th	สมหญิง	ใจดี	สมหญิง ใจดี	requester	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 04:45:59.595425		{user}	APPROVED	\N	\N	\N	\N	\N
5	1	4	kan@sena.co.th	แคน	ดีไซน์	แคน ดีไซน์	assignee	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 09:19:14.31065		{user}	APPROVED	\N	\N	\N	\N	\N
10000	1	\N	admin@test.com	Admin	System	Admin System	\N	\N	\N	t	2026-01-30 09:51:20.506+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:52.199823	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10001	1	\N	manager@test.com	Manager	Test	Manager Test	\N	\N	\N	t	2026-01-30 09:53:27.837+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:54.242213	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10002	1	\N	designer@test.com	Designer	Test	Designer Test	\N	\N	\N	t	2026-01-30 09:53:29.899+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:55.544815	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
11	1	10	waraporn@sena.co.th	วราภรณ์	ตลาด	วราภรณ์ ตลาด	requester	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 09:19:43.335631		{user}	APPROVED	\N	\N	\N	\N	\N
3	1	8	somchai@sena.co.th	สมชาย	มานะ	สมชาย มานะ	requester	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 02:50:38.828408		{user}	APPROVED	\N	\N	\N	\N	\N
9	1	4	apinya@sena.co.th	อภิญญา	สร้างสรรค์	อภิญญา สร้างสรรค์	assignee	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 09:20:21.279558		{user}	APPROVED	\N	\N	\N	\N	\N
10003	1	\N	requester@test.com	Requester	Test	Requester Test	\N	\N	\N	t	2026-01-30 09:53:31.869+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:56.555819	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
7	1	8	nattaya@sena.co.th	ณัฐยา	สุขใจ	ณัฐยา สุขใจ	requester	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-02 09:47:44.788764		{user}	APPROVED	\N	\N	\N	\N	\N
10004	1	\N	approver1@test.com	Approver1	Test	Approver1 Test	\N	\N	\N	t	2026-02-03 02:27:47.806+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:57.568457	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10005	1	\N	approver2@test.com	Approver2	Test	Approver2 Test	\N	\N	\N	t	2026-02-03 02:27:49.814+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:58.574889	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10006	1	\N	approver3@test.com	Approver3	Test	Approver3 Test	\N	\N	\N	t	2026-02-03 02:27:51.831+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:42:59.580116	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10007	1	\N	requester1@test.com	Requester1	Test	Requester1 Test	\N	\N	\N	t	2026-02-03 02:27:53.828+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:00.604058	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10008	1	\N	requester2@test.com	Requester2	Test	Requester2 Test	\N	\N	\N	t	2026-02-03 02:27:56.136+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:01.622306	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10009	1	\N	assignee1@test.com	Assignee1	Test	Assignee1 Test	\N	\N	\N	t	2026-02-03 02:27:58.699+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:02.697511	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10010	1	\N	assignee2@test.com	Assignee2	Test	Assignee2 Test	\N	\N	\N	t	2026-02-03 02:28:01.564+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:03.715306	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10011	1	\N	assignee3@test.com	Assignee3	Test	Assignee3 Test	\N	\N	\N	t	2026-02-03 02:28:03.998+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:04.731225	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
10012	1	\N	assignee4@test.com	Assignee4	Test	Assignee4 Test	\N	\N	\N	t	2026-02-03 02:28:05.985+00	\N	f	\N	\N	\N	\N	\N	2026-02-03 02:43:05.877298	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
12	1	\N	admin2@sena.co.th	Admin	SENX	Admin SENX	admin	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-04 06:19:03.22927	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
13	1	\N	marketing2@sena.co.th	Marketing	SENX	Marketing SENX	requester	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-04 06:19:12.92501	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
14	1	\N	designer2@sena.co.th	Designer	SENX	Graphic SENX	assignee	\N	\N	t	2026-01-20 10:56:07.662953+00	\N	f	\N	\N	\N	\N	\N	2026-02-04 06:19:26.872503	$2b$10$bm3FaxWwX4VfEZfq06OcIe9nEkmUTISlBFEdDGDgU2IFQDbCiYenS	{user}	APPROVED	\N	\N	\N	\N	\N
\.


--
-- Data for Name: messages_2026_01_31; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_01_31 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_01; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_01 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_02; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_02 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_03; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_03 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_04; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_04 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_05; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_05 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_02_06; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_02_06 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-01-20 06:46:32
20211116045059	2026-01-20 06:46:32
20211116050929	2026-01-20 06:46:33
20211116051442	2026-01-20 06:46:34
20211116212300	2026-01-20 06:46:35
20211116213355	2026-01-20 06:46:36
20211116213934	2026-01-20 06:46:37
20211116214523	2026-01-20 06:46:37
20211122062447	2026-01-20 06:46:38
20211124070109	2026-01-20 06:46:39
20211202204204	2026-01-20 06:46:39
20211202204605	2026-01-20 06:46:40
20211210212804	2026-01-20 06:46:42
20211228014915	2026-01-20 06:46:42
20220107221237	2026-01-20 06:46:43
20220228202821	2026-01-20 06:46:43
20220312004840	2026-01-20 06:46:44
20220603231003	2026-01-20 06:46:45
20220603232444	2026-01-20 06:46:46
20220615214548	2026-01-20 06:46:46
20220712093339	2026-01-20 06:46:47
20220908172859	2026-01-20 06:46:47
20220916233421	2026-01-20 06:46:48
20230119133233	2026-01-20 06:46:49
20230128025114	2026-01-20 06:46:49
20230128025212	2026-01-20 06:46:50
20230227211149	2026-01-20 06:46:50
20230228184745	2026-01-20 06:46:51
20230308225145	2026-01-20 06:46:52
20230328144023	2026-01-20 06:46:52
20231018144023	2026-01-20 06:46:53
20231204144023	2026-01-20 06:46:54
20231204144024	2026-01-20 06:46:54
20231204144025	2026-01-20 06:46:55
20240108234812	2026-01-20 06:46:56
20240109165339	2026-01-20 06:46:56
20240227174441	2026-01-20 06:46:57
20240311171622	2026-01-20 06:46:58
20240321100241	2026-01-20 06:46:59
20240401105812	2026-01-20 06:47:01
20240418121054	2026-01-20 06:47:02
20240523004032	2026-01-20 06:47:04
20240618124746	2026-01-20 06:47:04
20240801235015	2026-01-20 06:47:05
20240805133720	2026-01-20 06:47:05
20240827160934	2026-01-20 06:47:06
20240919163303	2026-01-20 06:47:07
20240919163305	2026-01-20 06:47:07
20241019105805	2026-01-20 06:47:08
20241030150047	2026-01-20 06:47:10
20241108114728	2026-01-20 06:47:11
20241121104152	2026-01-20 06:47:12
20241130184212	2026-01-20 06:47:12
20241220035512	2026-01-20 06:47:13
20241220123912	2026-01-20 06:47:13
20241224161212	2026-01-20 06:47:14
20250107150512	2026-01-20 06:47:15
20250110162412	2026-01-20 06:47:15
20250123174212	2026-01-20 06:47:16
20250128220012	2026-01-20 06:47:16
20250506224012	2026-01-20 06:47:17
20250523164012	2026-01-20 06:47:17
20250714121412	2026-01-20 06:47:18
20250905041441	2026-01-20 06:47:18
20251103001201	2026-01-20 06:47:19
20251120212548	2026-02-04 06:54:09
20251120215549	2026-02-04 06:54:10
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-01-20 06:46:50.334302
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-01-20 06:46:50.342946
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2026-01-20 06:46:50.349833
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-01-20 06:46:50.36652
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-01-20 06:46:50.374421
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-01-20 06:46:50.378674
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2026-01-20 06:46:50.383967
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-01-20 06:46:50.388677
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-01-20 06:46:50.393516
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2026-01-20 06:46:50.400132
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2026-01-20 06:46:50.404947
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-01-20 06:46:50.410593
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-01-20 06:46:50.418869
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-01-20 06:46:50.426578
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-01-20 06:46:50.431282
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-01-20 06:46:50.450962
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-01-20 06:46:50.455607
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-01-20 06:46:50.460026
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-01-20 06:46:50.464343
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-01-20 06:46:50.470162
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-01-20 06:46:50.474807
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-01-20 06:46:50.480983
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-01-20 06:46:50.492949
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-01-20 06:46:50.502418
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-01-20 06:46:50.507383
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-01-20 06:46:50.511793
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2026-01-20 06:46:50.516567
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2026-01-20 06:46:50.527254
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2026-01-20 06:46:50.553107
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2026-01-20 06:46:50.560371
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2026-01-20 06:46:50.566362
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2026-01-20 06:46:50.572263
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2026-01-20 06:46:50.576935
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2026-01-20 06:46:50.581966
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2026-01-20 06:46:50.583937
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2026-01-20 06:46:50.589796
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2026-01-20 06:46:50.595004
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-01-20 06:46:50.608893
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2026-01-20 06:46:50.613996
39	add-search-v2-sort-support	39cf7d1e6bf515f4b02e41237aba845a7b492853	2026-01-20 06:46:50.621972
40	fix-prefix-race-conditions-optimized	fd02297e1c67df25a9fc110bf8c8a9af7fb06d1f	2026-01-20 06:46:50.627319
41	add-object-level-update-trigger	44c22478bf01744b2129efc480cd2edc9a7d60e9	2026-01-20 06:46:50.635513
42	rollback-prefix-triggers	f2ab4f526ab7f979541082992593938c05ee4b47	2026-01-20 06:46:50.640996
43	fix-object-level	ab837ad8f1c7d00cc0b7310e989a23388ff29fc6	2026-01-20 06:46:50.647442
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-01-20 06:46:50.655024
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-01-20 06:46:50.661
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-01-20 06:46:50.671946
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-01-20 06:46:50.677042
48	iceberg-catalog-ids	2666dff93346e5d04e0a878416be1d5fec345d6f	2026-01-20 06:46:50.681334
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-01-20 06:46:50.695167
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 6, true);


--
-- Name: approval_flows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_flows_id_seq', 76, true);


--
-- Name: approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approvals_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 73, true);


--
-- Name: buds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.buds_id_seq', 5, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 17, true);


--
-- Name: design_job_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.design_job_items_id_seq', 1, false);


--
-- Name: design_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.design_jobs_id_seq', 4, true);


--
-- Name: dj_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dj_id_seq', 6, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 26, true);


--
-- Name: job_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_activities_id_seq', 1, false);


--
-- Name: job_type_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_type_items_id_seq', 26, true);


--
-- Name: job_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_types_id_seq', 102, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 40, true);


--
-- Name: media_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_files_id_seq', 1, false);


--
-- Name: notification_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_logs_id_seq', 1, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, true);


--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_requests_id_seq', 1, false);


--
-- Name: project_job_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_job_assignments_id_seq', 100, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 9, false);


--
-- Name: sla_shift_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sla_shift_logs_id_seq', 1, false);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_id_seq', 7, true);


--
-- Name: user_registration_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_registration_requests_id_seq', 1, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 57, true);


--
-- Name: user_scope_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_scope_assignments_id_seq', 79, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 10012, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: approval_flows approval_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: buds buds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buds
    ADD CONSTRAINT buds_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: design_job_items design_job_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_job_items
    ADD CONSTRAINT design_job_items_pkey PRIMARY KEY (id);


--
-- Name: design_jobs design_jobs_dj_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_dj_id_key UNIQUE (dj_id);


--
-- Name: design_jobs design_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: job_activities job_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_activities
    ADD CONSTRAINT job_activities_pkey PRIMARY KEY (id);


--
-- Name: job_type_items job_type_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_type_items
    ADD CONSTRAINT job_type_items_pkey PRIMARY KEY (id);


--
-- Name: job_types job_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_types
    ADD CONSTRAINT job_types_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_dj_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_dj_id_key UNIQUE (dj_id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_requests password_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: project_job_assignments project_job_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments
    ADD CONSTRAINT project_job_assignments_pkey PRIMARY KEY (id);


--
-- Name: project_job_assignments project_job_assignments_project_id_job_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments
    ADD CONSTRAINT project_job_assignments_project_id_job_type_id_key UNIQUE (project_id, job_type_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: sla_shift_logs sla_shift_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_shift_logs
    ADD CONSTRAINT sla_shift_logs_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_code_key UNIQUE (code);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);


--
-- Name: user_roles unique_user_role_per_tenant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT unique_user_role_per_tenant UNIQUE (user_id, tenant_id, role_name);


--
-- Name: user_registration_requests user_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registration_requests
    ADD CONSTRAINT user_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: user_registration_requests user_registration_requests_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registration_requests
    ADD CONSTRAINT user_registration_requests_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_scope_assignments user_scope_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_scope_assignments
    ADD CONSTRAINT user_scope_assignments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_31 messages_2026_01_31_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_01_31
    ADD CONSTRAINT messages_2026_01_31_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_01 messages_2026_02_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_01
    ADD CONSTRAINT messages_2026_02_01_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_02 messages_2026_02_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_02
    ADD CONSTRAINT messages_2026_02_02_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_03 messages_2026_02_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_03
    ADD CONSTRAINT messages_2026_02_03_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_04 messages_2026_02_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_04
    ADD CONSTRAINT messages_2026_02_04_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_05 messages_2026_02_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_05
    ADD CONSTRAINT messages_2026_02_05_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_06 messages_2026_02_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_06
    ADD CONSTRAINT messages_2026_02_06_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_approval_flows_job_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_flows_job_type ON public.approval_flows USING btree (job_type_id);


--
-- Name: idx_approval_flows_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_flows_project ON public.approval_flows USING btree (project_id);


--
-- Name: idx_approval_flows_project_jobtype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_flows_project_jobtype ON public.approval_flows USING btree (project_id, job_type_id);


--
-- Name: idx_approval_flows_team_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_flows_team_lead_id ON public.approval_flows USING btree (team_lead_id);


--
-- Name: idx_approval_flows_unique_project_jobtype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_approval_flows_unique_project_jobtype ON public.approval_flows USING btree (project_id, COALESCE(job_type_id, 0)) WHERE (is_active = true);


--
-- Name: idx_approvals_approver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_approver_id ON public.approvals USING btree (approver_id);


--
-- Name: idx_approvals_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_job_id ON public.approvals USING btree (job_id);


--
-- Name: idx_approvals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_status ON public.approvals USING btree (status);


--
-- Name: idx_approvals_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_tenant_id ON public.approvals USING btree (tenant_id);


--
-- Name: idx_approvals_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_token ON public.approvals USING btree (approval_token);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_created_at_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at_tenant ON public.audit_logs USING btree (tenant_id, created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_user_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_action ON public.audit_logs USING btree (user_id, action);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_buds_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buds_tenant_id ON public.buds USING btree (tenant_id);


--
-- Name: idx_departments_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_is_active ON public.departments USING btree (is_active);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_manager_id ON public.departments USING btree (manager_id);


--
-- Name: idx_departments_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_tenant_id ON public.departments USING btree (tenant_id);


--
-- Name: idx_design_jobs_assignee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_design_jobs_assignee_id ON public.design_jobs USING btree (assignee_id);


--
-- Name: idx_design_jobs_requester_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_design_jobs_requester_id ON public.design_jobs USING btree (requester_id);


--
-- Name: idx_design_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_design_jobs_status ON public.design_jobs USING btree (status);


--
-- Name: idx_design_jobs_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_design_jobs_tenant_id ON public.design_jobs USING btree (tenant_id);


--
-- Name: idx_job_activities_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_activities_job_id ON public.job_activities USING btree (job_id);


--
-- Name: idx_job_activities_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_activities_tenant_id ON public.job_activities USING btree (tenant_id);


--
-- Name: idx_job_activities_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_activities_user_id ON public.job_activities USING btree (user_id);


--
-- Name: idx_job_type_items_job_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_type_items_job_type_id ON public.job_type_items USING btree (job_type_id);


--
-- Name: idx_jobs_assignee_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_assignee_status ON public.jobs USING btree (assignee_id, status);


--
-- Name: idx_jobs_completed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_completed_at ON public.jobs USING btree (completed_at);


--
-- Name: idx_jobs_completed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_completed_by ON public.jobs USING btree (completed_by);


--
-- Name: idx_jobs_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_deleted_at ON public.jobs USING btree (deleted_at);


--
-- Name: idx_jobs_is_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_is_parent ON public.jobs USING btree (is_parent);


--
-- Name: idx_jobs_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_parent_id ON public.jobs USING btree (parent_job_id);


--
-- Name: idx_jobs_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_priority ON public.jobs USING btree (priority);


--
-- Name: idx_media_files_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_job_id ON public.media_files USING btree (job_id);


--
-- Name: idx_media_files_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_tenant_id ON public.media_files USING btree (tenant_id);


--
-- Name: idx_media_files_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_files_uploaded_by ON public.media_files USING btree (uploaded_by);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_tenant_id ON public.notifications USING btree (tenant_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_password_reset_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_requests_created_at ON public.password_reset_requests USING btree (created_at DESC);


--
-- Name: idx_password_reset_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests USING btree (status);


--
-- Name: idx_password_reset_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_requests_user_id ON public.password_reset_requests USING btree (user_id);


--
-- Name: idx_tenants_subdomain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenants_subdomain ON public.tenants USING btree (subdomain);


--
-- Name: idx_user_registration_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_registration_requests_created_at ON public.user_registration_requests USING btree (created_at DESC);


--
-- Name: idx_user_registration_requests_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_registration_requests_email ON public.user_registration_requests USING btree (email);


--
-- Name: idx_user_registration_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_registration_requests_status ON public.user_registration_requests USING btree (status);


--
-- Name: idx_user_registration_requests_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_registration_requests_tenant_id ON public.user_registration_requests USING btree (tenant_id);


--
-- Name: idx_user_roles_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_is_active ON public.user_roles USING btree (is_active);


--
-- Name: idx_user_roles_role_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_name ON public.user_roles USING btree (role_name);


--
-- Name: idx_user_roles_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_tenant_id ON public.user_roles USING btree (tenant_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_scope_assignments_role_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_assignments_role_type ON public.user_scope_assignments USING btree (role_type);


--
-- Name: idx_user_scope_assignments_scope_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_assignments_scope_id ON public.user_scope_assignments USING btree (scope_id);


--
-- Name: idx_user_scope_assignments_scope_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_assignments_scope_level ON public.user_scope_assignments USING btree (scope_level);


--
-- Name: idx_user_scope_assignments_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_assignments_tenant_id ON public.user_scope_assignments USING btree (tenant_id);


--
-- Name: idx_user_scope_assignments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_assignments_user_id ON public.user_scope_assignments USING btree (user_id);


--
-- Name: idx_user_scope_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_tenant_id ON public.user_scope_assignments USING btree (tenant_id);


--
-- Name: idx_user_scope_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_scope_user_id ON public.user_scope_assignments USING btree (user_id);


--
-- Name: idx_users_approved_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_approved_by ON public.users USING btree (approved_by);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_sso_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_sso_provider ON public.users USING btree (sso_provider);


--
-- Name: idx_users_sso_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_sso_unique ON public.users USING btree (tenant_id, sso_provider, sso_user_id) WHERE ((sso_provider IS NOT NULL) AND (sso_user_id IS NOT NULL));


--
-- Name: idx_users_sso_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_sso_user_id ON public.users USING btree (sso_user_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_status_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status_tenant ON public.users USING btree (tenant_id, status);


--
-- Name: jobs_assignee_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_assignee_status_idx ON public.jobs USING btree (assignee_id, status);


--
-- Name: jobs_requester_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_requester_created_idx ON public.jobs USING btree (requester_id, created_at);


--
-- Name: jobs_tenant_status_due_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_tenant_status_due_idx ON public.jobs USING btree (tenant_id, status, due_date);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_31_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_01_31_inserted_at_topic_idx ON realtime.messages_2026_01_31 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_01_inserted_at_topic_idx ON realtime.messages_2026_02_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_02_inserted_at_topic_idx ON realtime.messages_2026_02_02 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_03_inserted_at_topic_idx ON realtime.messages_2026_02_03 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_04_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_04_inserted_at_topic_idx ON realtime.messages_2026_02_04 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_05_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_05_inserted_at_topic_idx ON realtime.messages_2026_02_05 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_06_inserted_at_topic_idx ON realtime.messages_2026_02_06 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_01_31_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_31_inserted_at_topic_idx;


--
-- Name: messages_2026_01_31_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_31_pkey;


--
-- Name: messages_2026_02_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_01_inserted_at_topic_idx;


--
-- Name: messages_2026_02_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_01_pkey;


--
-- Name: messages_2026_02_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_02_inserted_at_topic_idx;


--
-- Name: messages_2026_02_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_02_pkey;


--
-- Name: messages_2026_02_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_03_inserted_at_topic_idx;


--
-- Name: messages_2026_02_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_03_pkey;


--
-- Name: messages_2026_02_04_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_04_inserted_at_topic_idx;


--
-- Name: messages_2026_02_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_04_pkey;


--
-- Name: messages_2026_02_05_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_05_inserted_at_topic_idx;


--
-- Name: messages_2026_02_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_05_pkey;


--
-- Name: messages_2026_02_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_06_inserted_at_topic_idx;


--
-- Name: messages_2026_02_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_06_pkey;


--
-- Name: jobs set_dj_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_dj_id BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.generate_dj_id();


--
-- Name: jobs trigger_audit_jobs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_audit_jobs AFTER INSERT OR DELETE OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.audit_jobs_changes();


--
-- Name: users trigger_audit_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_audit_users AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_users_changes();


--
-- Name: jobs trigger_update_parent_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_parent_status AFTER UPDATE OF status ON public.jobs FOR EACH ROW WHEN ((new.parent_job_id IS NOT NULL)) EXECUTE FUNCTION public.update_parent_status();


--
-- Name: design_jobs update_design_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_design_jobs_updated_at BEFORE UPDATE ON public.design_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_scope_assignments update_user_scope_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_scope_assignments_updated_at BEFORE UPDATE ON public.user_scope_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: approval_flows approval_flows_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: approval_flows approval_flows_auto_assign_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_auto_assign_user_id_fkey FOREIGN KEY (auto_assign_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_flows approval_flows_job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES public.job_types(id);


--
-- Name: approval_flows approval_flows_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: approval_flows approval_flows_team_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_team_lead_id_fkey FOREIGN KEY (team_lead_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_flows approval_flows_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: approvals approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: approvals approvals_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.design_jobs(id);


--
-- Name: approvals approvals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: buds buds_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buds
    ADD CONSTRAINT buds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: departments departments_bud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_bud_id_fkey FOREIGN KEY (bud_id) REFERENCES public.buds(id);


--
-- Name: departments departments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: design_job_items design_job_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_job_items
    ADD CONSTRAINT design_job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: design_job_items design_job_items_job_type_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_job_items
    ADD CONSTRAINT design_job_items_job_type_item_id_fkey FOREIGN KEY (job_type_item_id) REFERENCES public.job_type_items(id);


--
-- Name: design_jobs design_jobs_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: design_jobs design_jobs_job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES public.job_types(id);


--
-- Name: design_jobs design_jobs_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: design_jobs design_jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.design_jobs
    ADD CONSTRAINT design_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: departments fk_manager; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: holidays holidays_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: job_activities job_activities_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_activities
    ADD CONSTRAINT job_activities_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.design_jobs(id);


--
-- Name: job_activities job_activities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_activities
    ADD CONSTRAINT job_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: job_activities job_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_activities
    ADD CONSTRAINT job_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: job_type_items job_type_items_job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_type_items
    ADD CONSTRAINT job_type_items_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES public.job_types(id) ON DELETE CASCADE;


--
-- Name: job_types job_types_default_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_types
    ADD CONSTRAINT job_types_default_assignee_id_fkey FOREIGN KEY (default_assignee_id) REFERENCES public.users(id);


--
-- Name: job_types job_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_types
    ADD CONSTRAINT job_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: jobs jobs_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: jobs jobs_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: jobs jobs_close_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_close_requested_by_fkey FOREIGN KEY (close_requested_by) REFERENCES public.users(id);


--
-- Name: jobs jobs_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);


--
-- Name: jobs jobs_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobs jobs_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: jobs jobs_job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES public.job_types(id);


--
-- Name: jobs jobs_parent_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_parent_job_id_fkey FOREIGN KEY (parent_job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;


--
-- Name: jobs jobs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: jobs jobs_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: jobs jobs_shifted_by_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_shifted_by_job_id_fkey FOREIGN KEY (shifted_by_job_id) REFERENCES public.jobs(id);


--
-- Name: jobs jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: media_files media_files_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.design_jobs(id);


--
-- Name: media_files media_files_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: media_files media_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: notification_logs notification_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: notification_logs notification_logs_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_requests password_reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_job_assignments project_job_assignments_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments
    ADD CONSTRAINT project_job_assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: project_job_assignments project_job_assignments_job_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments
    ADD CONSTRAINT project_job_assignments_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES public.job_types(id) ON DELETE CASCADE;


--
-- Name: project_job_assignments project_job_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_job_assignments
    ADD CONSTRAINT project_job_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_bud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_bud_id_fkey FOREIGN KEY (bud_id) REFERENCES public.buds(id);


--
-- Name: projects projects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: projects projects_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: sla_shift_logs sla_shift_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_shift_logs
    ADD CONSTRAINT sla_shift_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: sla_shift_logs sla_shift_logs_urgent_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_shift_logs
    ADD CONSTRAINT sla_shift_logs_urgent_job_id_fkey FOREIGN KEY (urgent_job_id) REFERENCES public.jobs(id);


--
-- Name: user_registration_requests user_registration_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registration_requests
    ADD CONSTRAINT user_registration_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_registration_requests user_registration_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registration_requests
    ADD CONSTRAINT user_registration_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_scope_assignments user_scope_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_scope_assignments
    ADD CONSTRAINT user_scope_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_scope_assignments user_scope_assignments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_scope_assignments
    ADD CONSTRAINT user_scope_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_scope_assignments user_scope_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_scope_assignments
    ADD CONSTRAINT user_scope_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: users users_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_registration_requests Admin View Requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin View Requests" ON public.user_registration_requests FOR SELECT TO authenticated USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::integer));


--
-- Name: user_registration_requests Allow authenticated select on user_registration_requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated select on user_registration_requests" ON public.user_registration_requests FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Allow authenticated select on user_roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated select on user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: user_scope_assignments Allow authenticated select on user_scope_assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated select on user_scope_assignments" ON public.user_scope_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: password_reset_requests Allow public select own reset request; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public select own reset request" ON public.password_reset_requests FOR SELECT USING (true);


--
-- Name: password_reset_requests Public Insert Request; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public Insert Request" ON public.password_reset_requests FOR INSERT WITH CHECK ((otp_code IS NOT NULL));


--
-- Name: user_registration_requests Public Register Request; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public Register Request" ON public.user_registration_requests FOR INSERT WITH CHECK ((email IS NOT NULL));


--
-- Name: activity_logs Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.activity_logs TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: approval_flows Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.approval_flows USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)))) WITH CHECK ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer))));


--
-- Name: buds Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.buds USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: departments Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.departments USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: design_job_items Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.design_job_items TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: holidays Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.holidays TO authenticated USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::integer)) WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::integer));


--
-- Name: job_type_items Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.job_type_items TO authenticated USING ((job_type_id IN ( SELECT job_types.id
   FROM public.job_types
  WHERE (job_types.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: job_types Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.job_types USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: jobs Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.jobs USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: notification_logs Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.notification_logs TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: notifications Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.notifications TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: project_job_assignments Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.project_job_assignments TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: projects Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.projects USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: sla_shift_logs Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.sla_shift_logs TO authenticated USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.tenant_id = (current_setting('app.tenant_id'::text, true))::integer))));


--
-- Name: tenants Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.tenants USING ((id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: users Tenant Isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant Isolation" ON public.users USING ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer)) WITH CHECK ((tenant_id = ((auth.jwt() ->> 'tenantId'::text))::integer));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_flows; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.approval_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: approvals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_tenant_isolation ON public.audit_logs USING ((tenant_id = (COALESCE(current_setting('app.tenant_id'::text, true), (auth.jwt() ->> 'tenantId'::text)))::integer)) WITH CHECK ((tenant_id = (COALESCE(current_setting('app.tenant_id'::text, true), (auth.jwt() ->> 'tenantId'::text)))::integer));


--
-- Name: buds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.buds ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: design_job_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.design_job_items ENABLE ROW LEVEL SECURITY;

--
-- Name: design_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.design_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: holidays; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

--
-- Name: job_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: job_type_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_type_items ENABLE ROW LEVEL SECURITY;

--
-- Name: job_types; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_types ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: media_files; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: project_job_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_job_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: sla_shift_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sla_shift_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_registration_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_scope_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_scope_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION audit_approvals_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.audit_approvals_changes() TO anon;
GRANT ALL ON FUNCTION public.audit_approvals_changes() TO authenticated;
GRANT ALL ON FUNCTION public.audit_approvals_changes() TO service_role;


--
-- Name: FUNCTION audit_jobs_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.audit_jobs_changes() TO anon;
GRANT ALL ON FUNCTION public.audit_jobs_changes() TO authenticated;
GRANT ALL ON FUNCTION public.audit_jobs_changes() TO service_role;


--
-- Name: FUNCTION audit_users_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.audit_users_changes() TO anon;
GRANT ALL ON FUNCTION public.audit_users_changes() TO authenticated;
GRANT ALL ON FUNCTION public.audit_users_changes() TO service_role;


--
-- Name: FUNCTION cleanup_deleted_records(p_days_old integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_deleted_records(p_days_old integer) TO anon;
GRANT ALL ON FUNCTION public.cleanup_deleted_records(p_days_old integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_deleted_records(p_days_old integer) TO service_role;


--
-- Name: FUNCTION create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) TO anon;
GRANT ALL ON FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) TO authenticated;
GRANT ALL ON FUNCTION public.create_audit_log(p_tenant_id integer, p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_name character varying, p_old_values jsonb, p_new_values jsonb, p_description text, p_metadata jsonb, p_user_ip character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) TO service_role;


--
-- Name: FUNCTION create_job_with_items(p_job_data jsonb, p_items_data jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_job_with_items(p_job_data jsonb, p_items_data jsonb) TO service_role;


--
-- Name: FUNCTION debug_jwt(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.debug_jwt() TO anon;
GRANT ALL ON FUNCTION public.debug_jwt() TO authenticated;
GRANT ALL ON FUNCTION public.debug_jwt() TO service_role;


--
-- Name: FUNCTION generate_dj_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_dj_id() TO anon;
GRANT ALL ON FUNCTION public.generate_dj_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_dj_id() TO service_role;


--
-- Name: FUNCTION get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_entity_audit_trail(p_entity_type character varying, p_entity_id integer, p_limit integer) TO service_role;


--
-- Name: FUNCTION get_tenant_activity_summary(p_tenant_id integer, p_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_tenant_activity_summary(p_tenant_id integer, p_days integer) TO anon;
GRANT ALL ON FUNCTION public.get_tenant_activity_summary(p_tenant_id integer, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_tenant_activity_summary(p_tenant_id integer, p_days integer) TO service_role;


--
-- Name: FUNCTION get_user_activity(p_user_id integer, p_days integer, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_activity(p_user_id integer, p_days integer, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_user_activity(p_user_id integer, p_days integer, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_activity(p_user_id integer, p_days integer, p_limit integer) TO service_role;


--
-- Name: FUNCTION restore_deleted_job(p_job_id integer, p_restored_by integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) TO anon;
GRANT ALL ON FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) TO authenticated;
GRANT ALL ON FUNCTION public.restore_deleted_job(p_job_id integer, p_restored_by integer) TO service_role;


--
-- Name: FUNCTION soft_delete_job(p_job_id integer, p_deleted_by integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_job(p_job_id integer, p_deleted_by integer) TO service_role;


--
-- Name: FUNCTION soft_delete_user(p_user_id integer, p_deleted_by integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_user(p_user_id integer, p_deleted_by integer) TO service_role;


--
-- Name: FUNCTION update_parent_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_parent_status() TO anon;
GRANT ALL ON FUNCTION public.update_parent_status() TO authenticated;
GRANT ALL ON FUNCTION public.update_parent_status() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE activity_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activity_logs TO anon;
GRANT ALL ON TABLE public.activity_logs TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO service_role;


--
-- Name: SEQUENCE activity_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.activity_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.activity_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.activity_logs_id_seq TO service_role;


--
-- Name: TABLE approval_flow_steps_archive; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.approval_flow_steps_archive TO anon;
GRANT ALL ON TABLE public.approval_flow_steps_archive TO authenticated;
GRANT ALL ON TABLE public.approval_flow_steps_archive TO service_role;


--
-- Name: TABLE approval_flow_templates_archive; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.approval_flow_templates_archive TO anon;
GRANT ALL ON TABLE public.approval_flow_templates_archive TO authenticated;
GRANT ALL ON TABLE public.approval_flow_templates_archive TO service_role;


--
-- Name: TABLE approval_flows; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.approval_flows TO anon;
GRANT ALL ON TABLE public.approval_flows TO authenticated;
GRANT ALL ON TABLE public.approval_flows TO service_role;


--
-- Name: SEQUENCE approval_flows_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.approval_flows_id_seq TO anon;
GRANT ALL ON SEQUENCE public.approval_flows_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.approval_flows_id_seq TO service_role;


--
-- Name: TABLE approvals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.approvals TO anon;
GRANT ALL ON TABLE public.approvals TO authenticated;
GRANT ALL ON TABLE public.approvals TO service_role;


--
-- Name: SEQUENCE approvals_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.approvals_id_seq TO anon;
GRANT ALL ON SEQUENCE public.approvals_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.approvals_id_seq TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;


--
-- Name: TABLE buds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.buds TO anon;
GRANT ALL ON TABLE public.buds TO authenticated;
GRANT ALL ON TABLE public.buds TO service_role;


--
-- Name: SEQUENCE buds_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.buds_id_seq TO anon;
GRANT ALL ON SEQUENCE public.buds_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.buds_id_seq TO service_role;


--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.departments TO anon;
GRANT ALL ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;


--
-- Name: SEQUENCE departments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.departments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.departments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.departments_id_seq TO service_role;


--
-- Name: TABLE design_job_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.design_job_items TO anon;
GRANT ALL ON TABLE public.design_job_items TO authenticated;
GRANT ALL ON TABLE public.design_job_items TO service_role;


--
-- Name: SEQUENCE design_job_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.design_job_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.design_job_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.design_job_items_id_seq TO service_role;


--
-- Name: TABLE design_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.design_jobs TO anon;
GRANT ALL ON TABLE public.design_jobs TO authenticated;
GRANT ALL ON TABLE public.design_jobs TO service_role;


--
-- Name: SEQUENCE design_jobs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.design_jobs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.design_jobs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.design_jobs_id_seq TO service_role;


--
-- Name: SEQUENCE dj_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.dj_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dj_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dj_id_seq TO service_role;


--
-- Name: TABLE holidays; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.holidays TO anon;
GRANT ALL ON TABLE public.holidays TO authenticated;
GRANT ALL ON TABLE public.holidays TO service_role;


--
-- Name: SEQUENCE holidays_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.holidays_id_seq TO anon;
GRANT ALL ON SEQUENCE public.holidays_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.holidays_id_seq TO service_role;


--
-- Name: TABLE job_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_activities TO anon;
GRANT ALL ON TABLE public.job_activities TO authenticated;
GRANT ALL ON TABLE public.job_activities TO service_role;


--
-- Name: SEQUENCE job_activities_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.job_activities_id_seq TO anon;
GRANT ALL ON SEQUENCE public.job_activities_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.job_activities_id_seq TO service_role;


--
-- Name: TABLE job_type_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_type_items TO anon;
GRANT ALL ON TABLE public.job_type_items TO authenticated;
GRANT ALL ON TABLE public.job_type_items TO service_role;


--
-- Name: SEQUENCE job_type_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.job_type_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.job_type_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.job_type_items_id_seq TO service_role;


--
-- Name: TABLE job_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_types TO anon;
GRANT ALL ON TABLE public.job_types TO authenticated;
GRANT ALL ON TABLE public.job_types TO service_role;


--
-- Name: SEQUENCE job_types_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.job_types_id_seq TO anon;
GRANT ALL ON SEQUENCE public.job_types_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.job_types_id_seq TO service_role;


--
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.jobs TO anon;
GRANT ALL ON TABLE public.jobs TO authenticated;
GRANT ALL ON TABLE public.jobs TO service_role;


--
-- Name: SEQUENCE jobs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.jobs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.jobs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.jobs_id_seq TO service_role;


--
-- Name: TABLE media_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.media_files TO anon;
GRANT ALL ON TABLE public.media_files TO authenticated;
GRANT ALL ON TABLE public.media_files TO service_role;


--
-- Name: SEQUENCE media_files_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.media_files_id_seq TO anon;
GRANT ALL ON SEQUENCE public.media_files_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.media_files_id_seq TO service_role;


--
-- Name: TABLE notification_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_logs TO anon;
GRANT ALL ON TABLE public.notification_logs TO authenticated;
GRANT ALL ON TABLE public.notification_logs TO service_role;


--
-- Name: SEQUENCE notification_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notification_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notification_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notification_logs_id_seq TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO service_role;


--
-- Name: TABLE password_reset_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_reset_requests TO anon;
GRANT ALL ON TABLE public.password_reset_requests TO authenticated;
GRANT ALL ON TABLE public.password_reset_requests TO service_role;


--
-- Name: SEQUENCE password_reset_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_reset_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.password_reset_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.password_reset_requests_id_seq TO service_role;


--
-- Name: TABLE project_flow_approvers_archive; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_flow_approvers_archive TO anon;
GRANT ALL ON TABLE public.project_flow_approvers_archive TO authenticated;
GRANT ALL ON TABLE public.project_flow_approvers_archive TO service_role;


--
-- Name: TABLE project_flow_assignments_archive; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_flow_assignments_archive TO anon;
GRANT ALL ON TABLE public.project_flow_assignments_archive TO authenticated;
GRANT ALL ON TABLE public.project_flow_assignments_archive TO service_role;


--
-- Name: TABLE project_job_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_job_assignments TO anon;
GRANT ALL ON TABLE public.project_job_assignments TO authenticated;
GRANT ALL ON TABLE public.project_job_assignments TO service_role;


--
-- Name: SEQUENCE project_job_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.project_job_assignments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.project_job_assignments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.project_job_assignments_id_seq TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: SEQUENCE projects_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.projects_id_seq TO anon;
GRANT ALL ON SEQUENCE public.projects_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.projects_id_seq TO service_role;


--
-- Name: TABLE sla_shift_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sla_shift_logs TO anon;
GRANT ALL ON TABLE public.sla_shift_logs TO authenticated;
GRANT ALL ON TABLE public.sla_shift_logs TO service_role;


--
-- Name: SEQUENCE sla_shift_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sla_shift_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.sla_shift_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.sla_shift_logs_id_seq TO service_role;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;


--
-- Name: SEQUENCE tenants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tenants_id_seq TO anon;
GRANT ALL ON SEQUENCE public.tenants_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tenants_id_seq TO service_role;


--
-- Name: TABLE user_registration_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_registration_requests TO anon;
GRANT ALL ON TABLE public.user_registration_requests TO authenticated;
GRANT ALL ON TABLE public.user_registration_requests TO service_role;


--
-- Name: SEQUENCE user_registration_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_registration_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_registration_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_registration_requests_id_seq TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: SEQUENCE user_roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_roles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_roles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_roles_id_seq TO service_role;


--
-- Name: TABLE user_scope_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_scope_assignments TO anon;
GRANT ALL ON TABLE public.user_scope_assignments TO authenticated;
GRANT ALL ON TABLE public.user_scope_assignments TO service_role;


--
-- Name: SEQUENCE user_scope_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_scope_assignments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_scope_assignments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_scope_assignments_id_seq TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO anon;
GRANT ALL ON SEQUENCE public.users_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.users_id_seq TO service_role;


--
-- Name: TABLE v_active_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_active_jobs TO anon;
GRANT ALL ON TABLE public.v_active_jobs TO authenticated;
GRANT ALL ON TABLE public.v_active_jobs TO service_role;


--
-- Name: TABLE v_active_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_active_users TO anon;
GRANT ALL ON TABLE public.v_active_users TO authenticated;
GRANT ALL ON TABLE public.v_active_users TO service_role;


--
-- Name: TABLE v_parent_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_parent_jobs TO anon;
GRANT ALL ON TABLE public.v_parent_jobs TO authenticated;
GRANT ALL ON TABLE public.v_parent_jobs TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2026_01_31; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_01_31 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_01_31 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_01; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_01 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_01 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_02; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_02 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_02 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_03; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_03 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_03 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_04; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_04 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_04 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_05; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_05 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_05 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_06; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_06 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_06 TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict nkYZGmmrN78fjngonllaD57NjoKUns9Hz6LoHn59PWikGN7eRgSK5D0MixUgwXt

