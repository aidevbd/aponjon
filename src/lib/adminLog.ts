import { supabase } from "@/integrations/supabase/client";

export async function logAdminActivity(
  actionType: string,
  description: string,
  targetId?: string,
  targetType?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.rpc("log_admin_activity", {
      p_action_type: actionType,
      p_description: description,
      p_target_id: targetId || null,
      p_target_type: targetType || null,
      p_metadata: metadata || {},
    } as any);
  } catch {
    // Silent fail - logging should never block operations
  }
}
