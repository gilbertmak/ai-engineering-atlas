import type { ToolContext } from "@lovable.dev/mcp-js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type Handler<Input> = (input: Input, ctx: ToolContext) => ToolResult | Promise<ToolResult>;

const UNAUTHENTICATED: ToolResult = {
  content: [
    {
      type: "text",
      text: "Not authenticated. Connect this MCP server through the app's OAuth flow and sign in.",
    },
  ],
  isError: true,
};

/**
 * Redact anything that could carry a credential and cap the payload size so the
 * audit trail never stores secrets or unbounded blobs.
 */
function safeMetadata(input: unknown): Record<string, unknown> {
  if (input == null || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (/token|secret|password|authorization|apikey|api_key/i.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string") {
      out[key] = value.length > 500 ? `${value.slice(0, 500)}…` : value;
    } else if (["number", "boolean"].includes(typeof value) || value === null) {
      out[key] = value;
    } else {
      out[key] = JSON.stringify(value).slice(0, 500);
    }
  }
  return out;
}

type AuditRow = {
  tool_name: string;
  user_id: string | null;
  user_email: string | null;
  client_id: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number;
  request_metadata: Record<string, unknown>;
};

async function writeAuditLog(row: AuditRow) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("[mcp-audit] backend credentials unavailable; skipping audit write");
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/mcp_audit_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      console.error("[mcp-audit] write failed", response.status, await response.text());
    }
  } catch (error) {
    console.error("[mcp-audit] write threw", error);
  }
}

/**
 * Wraps a tool handler so every call is authenticated and recorded:
 * tool name, timestamp (row default), caller identity, OAuth client, redacted
 * request metadata, outcome, and duration.
 */
export function withAudit<Input>(toolName: string, handler: Handler<Input>): Handler<Input> {
  return async (input, ctx) => {
    const startedAt = Date.now();
    const metadata = safeMetadata(input);

    const base = {
      tool_name: toolName,
      user_id: null as string | null,
      user_email: null as string | null,
      client_id: null as string | null,
      request_metadata: metadata,
    };

    if (!ctx?.isAuthenticated?.()) {
      await writeAuditLog({
        ...base,
        status: "unauthorized",
        error_message: "Missing or invalid OAuth bearer token",
        duration_ms: Date.now() - startedAt,
      });
      return UNAUTHENTICATED;
    }

    base.user_id = ctx.getUserId?.() ?? null;
    base.user_email = ctx.getUserEmail?.() ?? null;
    base.client_id = ctx.getClientId?.() ?? null;

    try {
      const result = await handler(input, ctx);
      await writeAuditLog({
        ...base,
        status: result?.isError ? "tool_error" : "success",
        error_message: result?.isError ? (result.content?.[0]?.text ?? "tool error") : null,
        duration_ms: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await writeAuditLog({
        ...base,
        status: "exception",
        error_message: message,
        duration_ms: Date.now() - startedAt,
      });
      throw error;
    }
  };
}
