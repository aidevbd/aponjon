import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listContactsTool from "./tools/list-contacts";
import searchContactsTool from "./tools/search-contacts";
import getContactTool from "./tools/get-contact";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aponjon-mcp",
  title: "আপনজন (Aponjon)",
  version: "0.1.0",
  instructions:
    "Tools for the Aponjon contact directory. Sign in as an admin to list, search, and inspect contacts stored in the app. All access is scoped by the signed-in user's row-level policies.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listContactsTool, searchContactsTool, getContactTool],
});
