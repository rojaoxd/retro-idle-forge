import { createFileRoute, redirect } from "@tanstack/react-router";
import { TibiaShell } from "@/components/tibia/TibiaShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: Index,
});

function Index() {
  return <TibiaShell />;
}
