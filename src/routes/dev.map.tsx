import { createFileRoute } from "@tanstack/react-router";
import { MapEditor } from "@/components/dev/MapEditor";

export const Route = createFileRoute("/dev/map")({
  component: MapEditorPage,
});

function MapEditorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Editor de Mapa</h1>
        <p className="text-sm text-slate-400">
          Pinte o mundo direto no banco. Camada <b>floor</b> embaixo, <b>obstacles</b> em cima.
        </p>
      </div>
      <MapEditor />
    </div>
  );
}
