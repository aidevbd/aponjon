import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_contacts",
  title: "Search contacts",
  description:
    "Search Aponjon contacts by name, phone number, or note text. Case-insensitive partial match.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Text to search for in name, phone, or note."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const safe = query.replace(/[%,]/g, " ");
    const { data, error } = await client(ctx)
      .from("contacts")
      .select("id,name,phone,category,note,address,created_at")
      .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,note.ilike.%${safe}%`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { results: data },
    };
  },
});
