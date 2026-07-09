import { createFileRoute } from "@tanstack/react-router";
import { TibiaShell } from "@/components/tibia/TibiaShell";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <TibiaShell />;
}
