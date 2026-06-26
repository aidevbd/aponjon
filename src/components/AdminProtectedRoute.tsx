import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthState = "loading" | "authed" | "unauthed";

export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState(data.session ? "authed" : "unauthed");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(session ? "authed" : "unauthed");
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center">
        <Heart className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (state === "unauthed") return <Navigate to="/admin" replace />;

  return <>{children}</>;
};
