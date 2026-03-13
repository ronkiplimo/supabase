\set pguser `echo "$POSTGRES_USER"`

\c project_meta

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS project_meta;

CREATE TABLE IF NOT EXISTS project_meta.agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  summary text,
  system_prompt text,
  tools text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_meta.agent_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  agent_id uuid NOT NULL REFERENCES project_meta.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  schedule text NOT NULL,
  is_unique boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON project_meta.agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON project_meta.agent_tasks(agent_id);

CREATE TABLE IF NOT EXISTS project_meta.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text,
  task_id uuid REFERENCES project_meta.agent_tasks(id) ON DELETE SET NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON project_meta.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON project_meta.conversations(task_id);

CREATE TABLE IF NOT EXISTS project_meta.conversation_messages (
  id text PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES project_meta.conversations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES project_meta.agents(id) ON DELETE SET NULL,
  task_id uuid REFERENCES project_meta.agent_tasks(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'data', 'tool')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON project_meta.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_agent_id ON project_meta.conversation_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_task_id ON project_meta.conversation_messages(task_id);

CREATE TABLE IF NOT EXISTS project_meta.rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  default_message text,
  sql_query text,
  edge_function_name text,
  schedule text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rules_source_check CHECK (
    (sql_query IS NOT NULL AND edge_function_name IS NULL) OR
    (sql_query IS NULL AND edge_function_name IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_rules_user_id ON project_meta.rules(user_id);

CREATE TABLE IF NOT EXISTS project_meta.alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_alert_id uuid REFERENCES project_meta.alerts(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES project_meta.agents(id) ON DELETE SET NULL,
  user_id text,
  conversation_message_id text REFERENCES project_meta.conversation_messages(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES project_meta.rules(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON project_meta.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_agent_id ON project_meta.alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON project_meta.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_conversation_message_id ON project_meta.alerts(conversation_message_id);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON project_meta.alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_parent_alert_id ON project_meta.alerts(parent_alert_id);

CREATE TABLE IF NOT EXISTS project_meta.alert_messages (
  id text PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES project_meta.alerts(id) ON DELETE CASCADE,
  user_id text,
  agent_id uuid REFERENCES project_meta.agents(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_messages_alert_id ON project_meta.alert_messages(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_messages_user_id ON project_meta.alert_messages(user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION project_meta.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON project_meta.agents
  FOR EACH ROW EXECUTE FUNCTION project_meta.handle_updated_at();

CREATE OR REPLACE TRIGGER set_agent_tasks_updated_at
  BEFORE UPDATE ON project_meta.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION project_meta.handle_updated_at();

CREATE OR REPLACE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON project_meta.conversations
  FOR EACH ROW EXECUTE FUNCTION project_meta.handle_updated_at();

CREATE OR REPLACE TRIGGER set_rules_updated_at
  BEFORE UPDATE ON project_meta.rules
  FOR EACH ROW EXECUTE FUNCTION project_meta.handle_updated_at();

-- ============================================================================
-- Scheduler LISTEN/NOTIFY sync
-- ============================================================================

-- Fires pg_notify on project_meta_scheduler channel so project-meta-api can keep its
-- in-process croner jobs in sync without polling or restarting.
-- Payload: "<type>:<id>:<op>" e.g. "task:uuid:upsert" or "rule:uuid:delete"

CREATE OR REPLACE FUNCTION project_meta.notify_scheduler_task()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('project_meta_scheduler', 'task:' || OLD.id::text || ':delete');
    RETURN OLD;
  END IF;
  PERFORM pg_notify('project_meta_scheduler', 'task:' || NEW.id::text || ':upsert');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notify_agent_task_scheduler
  AFTER INSERT OR UPDATE OR DELETE ON project_meta.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION project_meta.notify_scheduler_task();

CREATE OR REPLACE FUNCTION project_meta.notify_scheduler_rule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('project_meta_scheduler', 'rule:' || OLD.id::text || ':delete');
    RETURN OLD;
  END IF;
  PERFORM pg_notify('project_meta_scheduler', 'rule:' || NEW.id::text || ':upsert');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notify_rule_scheduler
  AFTER INSERT OR UPDATE OR DELETE ON project_meta.rules
  FOR EACH ROW EXECUTE FUNCTION project_meta.notify_scheduler_rule();

-- Grant postgres user access to project_meta schema
GRANT USAGE ON SCHEMA project_meta TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA project_meta TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA project_meta TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA project_meta GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA project_meta GRANT ALL ON SEQUENCES TO postgres;

\c postgres
