CREATE TABLE public.mcp_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  client_id TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  duration_ms INTEGER,
  request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX mcp_audit_logs_created_at_idx ON public.mcp_audit_logs (created_at DESC);
CREATE INDEX mcp_audit_logs_user_id_idx ON public.mcp_audit_logs (user_id);
CREATE INDEX mcp_audit_logs_tool_name_idx ON public.mcp_audit_logs (tool_name);

GRANT SELECT ON public.mcp_audit_logs TO authenticated;
GRANT ALL ON public.mcp_audit_logs TO service_role;

ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP audit logs"
ON public.mcp_audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());