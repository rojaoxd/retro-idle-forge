import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  parseItems,
  parseVocations,
  parseOutfits,
  parseChannels,
  parseStages,
  parseGroups,
  parseSpells,
  parseMonster,
  parseNpc,
  parseHouses,
  parseSpawns,
} from "@/lib/otserv/parsers";
import {
  importOtservBatch,
  otservCounts,
} from "@/lib/otserv/import.functions";

export const Route = createFileRoute("/dev/import")({
  component: ImportPage,
});

type Task = { key: string; label: string; count: number; done: number; error?: string };

function ImportPage() {
  const importBatch = useServerFn(importOtservBatch);
  const getCounts = useServerFn(otservCounts);

  const [zip, setZip] = useState<JSZip | null>(null);
  const [zipName, setZipName] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [log, setLog] = useState<string[]>([]);

  const push = (m: string) => setLog((l) => [...l.slice(-200), m]);

  const onFile = useCallback(async (f: File) => {
    push(`abrindo ${f.name} (${(f.size / 1e6).toFixed(1)} MB)...`);
    const z = await JSZip.loadAsync(f);
    setZip(z);
    setZipName(f.name);
    push(`ok. ${Object.keys(z.files).length} arquivos no ZIP.`);
  }, []);

  const refreshCounts = useCallback(async () => {
    const c = await getCounts();
    setCounts(c);
  }, [getCounts]);

  // acha um arquivo ignorando prefixos tipo "otserv/otserv/data/..."
  const findFile = (z: JSZip, endsWith: string) => {
    const key = Object.keys(z.files).find(
      (k) => k.toLowerCase().replace(/\\/g, "/").endsWith(endsWith.toLowerCase()),
    );
    return key ? z.files[key] : null;
  };
  const findDir = (z: JSZip, prefix: string) => {
    const pfx = prefix.toLowerCase();
    return Object.keys(z.files).filter((k) => {
      const n = k.toLowerCase().replace(/\\/g, "/");
      return n.includes(pfx) && !z.files[k].dir;
    });
  };

  async function uploadBatched<T extends object>(
    table: any,
    rows: T[],
    onProgress: (done: number) => void,
    batchSize = 200,
  ) {
    let done = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const r = await importBatch({
        data: { table, rows: chunk as any, dryRun, replace: false },
      });
      done += r.count ?? chunk.length;
      onProgress(done);
    }
    return done;
  }

  const runAll = useCallback(async () => {
    if (!zip) return;
    setRunning(true);
    const initialTasks: Task[] = [
      { key: "vocations", label: "Vocações", count: 0, done: 0 },
      { key: "outfits", label: "Outfits", count: 0, done: 0 },
      { key: "channels", label: "Canais", count: 0, done: 0 },
      { key: "stages", label: "Stages de XP", count: 0, done: 0 },
      { key: "groups", label: "Grupos", count: 0, done: 0 },
      { key: "spells", label: "Magias/Runas", count: 0, done: 0 },
      { key: "items", label: "Items (3634 esperado)", count: 0, done: 0 },
      { key: "monsters", label: "Monstros", count: 0, done: 0 },
      { key: "npcs", label: "NPCs", count: 0, done: 0 },
      { key: "houses", label: "Casas", count: 0, done: 0 },
      { key: "spawns", label: "Spawns (10k+ esperado)", count: 0, done: 0 },
    ];
    setTasks(initialTasks);

    const upd = (k: string, patch: Partial<Task>) =>
      setTasks((ts) => ts.map((t) => (t.key === k ? { ...t, ...patch } : t)));

    try {
      // -------- pequenos XMLs unitários --------
      const single: Array<[string, string, (xml: string) => any[]]> = [
        ["vocations", "xml/vocations.xml", parseVocations],
        ["outfits", "xml/outfits.xml", parseOutfits],
        ["channels", "xml/channels.xml", parseChannels],
        ["stages", "xml/stages.xml", parseStages],
        ["groups", "xml/groups.xml", parseGroups],
        ["spells", "spells/spells.xml", parseSpells],
        ["items", "items/77/items.xml", parseItems],
        ["houses", "world/world-house.xml", parseHouses],
        ["spawns", "world/world-spawn.xml", parseSpawns],
      ];
      for (const [key, path, fn] of single) {
        const file = findFile(zip, path);
        if (!file) {
          push(`~ pulei ${key}: arquivo ${path} não encontrado no ZIP`);
          upd(key, { error: "arquivo não encontrado" });
          continue;
        }
        const xml = await file.async("string");
        const rows = fn(xml);
        upd(key, { count: rows.length });
        push(`${key}: ${rows.length} linhas parseadas de ${path}`);
        try {
          await uploadBatched(key as any, rows, (d) => upd(key, { done: d }));
        } catch (e: any) {
          upd(key, { error: e.message });
          push(`ERRO em ${key}: ${e.message}`);
        }
      }

      // -------- monstros (183 arquivos) --------
      const monsterFiles = findDir(zip, "/monster/").filter((k) =>
        k.toLowerCase().endsWith(".xml"),
      );
      const monsters: any[] = [];
      for (const path of monsterFiles) {
        const xml = await zip.files[path].async("string");
        const row = parseMonster(xml, path.split("/").pop());
        if (row) monsters.push(row);
      }
      // dedupe por nome
      const seenM = new Set();
      const uniqM = monsters.filter((m) =>
        seenM.has(m.name?.toLowerCase()) ? false : (seenM.add(m.name?.toLowerCase()), true),
      );
      upd("monsters", { count: uniqM.length });
      push(`monsters: ${uniqM.length} únicos (de ${monsters.length} arquivos)`);
      try {
        await uploadBatched("monsters", uniqM, (d) => upd("monsters", { done: d }));
      } catch (e: any) {
        upd("monsters", { error: e.message });
      }

      // -------- npcs (xml + lua) --------
      const npcFiles = findDir(zip, "/npc/").filter(
        (k) => k.toLowerCase().endsWith(".xml") && !k.toLowerCase().includes("/lib/"),
      );
      const npcs: any[] = [];
      for (const path of npcFiles) {
        const xml = await zip.files[path].async("string");
        const row = parseNpc(xml);
        if (!row) continue;
        // busca .lua correspondente
        if (row.script_file) {
          const luaPath = Object.keys(zip.files).find(
            (k) =>
              k.toLowerCase().replace(/\\/g, "/").endsWith(
                `/npc/scripts/${String(row.script_file).toLowerCase()}`,
              ) ||
              k.toLowerCase().replace(/\\/g, "/").endsWith(
                `/npc/${String(row.script_file).toLowerCase()}`,
              ),
          );
          if (luaPath) {
            const lua = await zip.files[luaPath].async("string");
            const enriched = parseNpc(xml, lua);
            if (enriched) npcs.push(enriched);
            continue;
          }
        }
        npcs.push(row);
      }
      upd("npcs", { count: npcs.length });
      push(`npcs: ${npcs.length} parseados`);
      try {
        await uploadBatched("npcs", npcs, (d) => upd("npcs", { done: d }));
      } catch (e: any) {
        upd("npcs", { error: e.message });
      }

      toast.success(dryRun ? "Dry-run concluído" : "Import concluído");
      await refreshCounts();
    } finally {
      setRunning(false);
    }
  }, [zip, dryRun, importBatch, refreshCounts]);

  const totalRows = useMemo(
    () => tasks.reduce((a, t) => a + t.count, 0),
    [tasks],
  );
  const totalDone = useMemo(
    () => tasks.reduce((a, t) => a + t.done, 0),
    [tasks],
  );

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          to="/dev/objects"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← voltar
        </Link>
        <h1 className="text-2xl font-bold">Import OTServ 7.4</h1>
      </div>

      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Faça upload do ZIP do OTServ (com <code>data/</code> dentro). O parse
          roda no browser e envia em batches. Ative <b>Dry-run</b> pra validar
          contagens antes de gravar.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            disabled={running}
          />
          {zipName && (
            <span className="text-xs text-muted-foreground">{zipName}</span>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            disabled={running}
          />
          Dry-run (não grava no banco)
        </label>
        <div className="flex gap-2">
          <Button onClick={runAll} disabled={!zip || running}>
            {running ? "Rodando..." : "Importar tudo"}
          </Button>
          <Button variant="outline" onClick={refreshCounts} disabled={running}>
            Ver contagens atuais
          </Button>
        </div>
      </Card>

      <WorldTilesCard
        importBatch={importBatch}
        push={push}
      />


      {tasks.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Progresso total</span>
            <span>
              {totalDone} / {totalRows}
            </span>
          </div>
          <Progress
            value={totalRows > 0 ? (totalDone * 100) / totalRows : 0}
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {tasks.map((t) => (
              <div
                key={t.key}
                className="border rounded p-2 text-xs space-y-1"
              >
                <div className="flex justify-between font-medium">
                  <span>{t.label}</span>
                  <span>
                    {t.done}/{t.count}
                  </span>
                </div>
                <Progress
                  value={t.count > 0 ? (t.done * 100) / t.count : 0}
                />
                {t.error && (
                  <div className="text-destructive">{t.error}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {Object.keys(counts).length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-2">Contagens no banco</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {log.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-2">Log</h3>
          <pre className="text-xs max-h-64 overflow-auto bg-muted p-2 rounded">
            {log.join("\n")}
          </pre>
        </Card>
      )}
    </div>
  );
}

function WorldTilesCard({
  importBatch,
  push,
}: {
  importBatch: (arg: { data: { table: any; rows: any[]; dryRun: boolean; replace: boolean } }) => Promise<{ count: number }>;
  push: (m: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(500);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState(0);
  const [status, setStatus] = useState<string>("");

  const run = useCallback(async () => {
    if (!file) return;
    setRunning(true); setDone(0); setErrors(0);
    setStatus(`lendo ${file.name} (${(file.size / 1e6).toFixed(1)} MB)...`);
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");
    let carry = "";
    let batch: any[] = [];
    let total = 0;

    const flush = async () => {
      if (!batch.length) return;
      try {
        const r = await importBatch({ data: { table: "world_tiles", rows: batch, dryRun, replace: false } });
        total += r.count ?? batch.length;
        setDone(total);
      } catch (e: any) {
        setErrors((n) => n + batch.length);
        push(`ERRO world_tiles batch: ${e.message}`);
      }
      batch = [];
    };

    try {
      while (true) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        carry += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = carry.indexOf("\n")) >= 0) {
          const line = carry.slice(0, nl).trim();
          carry = carry.slice(nl + 1);
          if (!line) continue;
          try {
            const row = JSON.parse(line);
            // sanitize: table columns are x,y,z,ground_id,items(JSONB),house_id,tile_flags
            batch.push({
              x: row.x, y: row.y, z: row.z,
              ground_id: row.ground_id ?? null,
              items: row.items ?? [],
              house_id: row.house_id ?? null,
              tile_flags: row.tile_flags ?? null,
            });
          } catch {
            setErrors((n) => n + 1);
          }
          if (batch.length >= batchSize) await flush();
        }
        setStatus(`processado ${(total).toLocaleString()} tiles...`);
      }
      if (carry.trim()) {
        try { batch.push(JSON.parse(carry)); } catch { setErrors((n) => n + 1); }
      }
      await flush();
      setStatus(`concluído: ${total.toLocaleString()} tiles enviados`);
      toast.success(dryRun ? "Dry-run mundo OK" : "Mundo importado");
    } finally {
      setRunning(false);
    }
  }, [file, dryRun, batchSize, importBatch, push]);

  return (
    <Card className="p-4 space-y-3">
      <h2 className="font-semibold">Mundo (.otbm → tiles.jsonl)</h2>
      <p className="text-sm text-muted-foreground">
        Rode <code>bun scripts/otserv-import/parse-otbm.ts data/world/world.otbm &gt; out/tiles.jsonl</code> localmente e faça upload do <code>tiles.jsonl</code> aqui. Streaming linha-por-linha, memória constante.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".jsonl,.ndjson,application/x-ndjson"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={running}
        />
        <label className="text-sm flex items-center gap-1">
          Batch:
          <input
            type="number"
            className="w-20 border rounded px-1"
            value={batchSize}
            onChange={(e) => setBatchSize(Math.max(50, Number(e.target.value) || 500))}
            disabled={running}
          />
        </label>
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={running} />
          Dry-run
        </label>
        <Button onClick={run} disabled={!file || running}>
          {running ? "Enviando..." : "Importar mundo"}
        </Button>
      </div>
      {(running || done > 0) && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{status}</div>
          <div>enviados: {done.toLocaleString()} · erros: {errors}</div>
        </div>
      )}
    </Card>
  );
}

