import { createFileRoute } from "@tanstack/react-router";
import { OverviewPanel } from "@/components/dev/OverviewPanel";

export const Route = createFileRoute("/dev/overview")({
  component: OverviewPanel,
});
