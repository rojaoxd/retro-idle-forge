import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Play, Pause, X, Upload, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createImportUploadUrls,
  createImportJob,
  processImportBatch,
  controlImportJob,
  getImportJob,
  listImportJobs,
} from "@/lib/dev/tibia/import.functions";

export const Route = createFileRoute("/dev/objects_/import-client")({ component: Page });

type JobRow = {
  id: string;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  dat_path: string;
  spr_path: string;
  otb_path: string | null;
  categories: any;
  total: number;
  cursor: number;
  sprites_uploaded: number;
  objects_inserted: number;
  objects_updated: number;
  objects_skipped: number;
  error: string | null;
  created_at: string;
};

const BUCKET = "game-sprites";

function Page() {
  const uploadUrlsFn = useServerFn(createImportUploadUrls);
  const createJobFn = useServerFn(createImportJob);
  const processFn = useServerFn(processImportBatch);
  const controlFn = useServerFn(controlImportJob);
  const getJobFn = useServerFn(getImportJob);
  const listJobsFn = useServerFn(listImportJobs);

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [activeJob, setActiveJob] = useState<JobRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState(20);
  const [cats, setCats] = useState({ item: true, outfit: true, effect: true, missile: true });
  const [datFile, setDatFile] = useState<File | null>(null);
  const [sprFile, setSprFile] = useState<File | null>(null);
  const [otbFile, setOtbFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef2 = useRef<null>(null); void runningRef2;
  const runningRef = useRef(false);

  const refreshList = useCallback(async () => {
    const { jobs } = await listJobsFn();
    setJobs(jobs as JobRow[]);
    // Auto-adopt an in-progress job
    const inProg = (jobs as JobRow[]).find(
      (j) => j.status === "running" || j.status === "pending" || j.status === "paused",
    );
    if (inProg) setActiveJob(inProg);
  }, [listJobsFn]);

  useEffect(() => { refreshList(); }, [refreshList]);

  const stopPolling = useCallback(() => {
    runningRef.current = false;
  }, []);


  const startPolling = useCallback((jobId: string) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const loop = async () => {
      while (runningRef.current) {
        try {
          const res = await processFn({ data: { jobId, batchSize } });
          const { job } = await getJobFn({ data: { jobId } });
          if (job) setActiveJob(job as JobRow);
          const done = res.status === "completed"
            || (job && (job.status === "paused" || job.status === "failed" || job.status === "completed"));
          if (done) { runningRef.current = false; await refreshList(); break; }
          // brief breath so UI can paint & user can pause
          await new Promise((r) => setTimeout(r, 200));
        } catch (e: any) {
          setError(e.message);
          runningRef.current = false;
          await refreshList();
          break;
        }
      }
    };
    void loop();
  }, [processFn, getJobFn, batchSize, refreshList]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Auto-resume a running job on mount
  useEffect(() => {
    if (activeJob && activeJob.status === "running" && !runningRef.current) {
      startPolling(activeJob.id);
    }
  }, [activeJob, startPolling]);

  // ---- actions -------------------------------------------------------------
  async function uploadToSigned(path: string, token: string, file: File) {
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, file, {
      contentType: file.name.endsWith(".dat") ? "application/octet-stream" : "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(`upload ${file.name}: ${error.message}`);
  }

  async function startNewImport() {
    setError(null);
    if (!datFile || !sprFile) { setError("Selecione Tibia.dat e Tibia.spr"); return; }
    setBusy(true);
    setUploadPct(0);
    try {
      const urls = await uploadUrlsFn({ data: {
        datFilename: datFile.name,
        sprFilename: sprFile.name,
        otbFilename: otbFile?.name,
      } });
      setUploadPct(10);
      await uploadToSigned(urls.dat.path, urls.dat.token, datFile);
      setUploadPct(30);
      await uploadToSigned(urls.spr.path, urls.spr.token, sprFile);
      setUploadPct(70);
      if (otbFile && urls.otb) await uploadToSigned(urls.otb.path, urls.otb.token, otbFile);
      setUploadPct(85);

      const { job } = await createJobFn({ data: {
        jobId: urls.jobId,
        datPath: urls.dat.path,
        sprPath: urls.spr.path,
        otbPath: urls.otb?.path ?? null,
        categories: cats,
      } });
      setUploadPct(100);
      setActiveJob(job as JobRow);
      startPolling(urls.jobId);
      await refreshList();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setTimeout(() => setUploadPct(null), 800);
    }
  }

  async function control(action: "pause" | "resume" | "cancel") {
    if (!activeJob) return;
    try {
      await controlFn({ data: { jobId: activeJob.id, action } });
      if (action === "resume") startPolling(activeJob.id);
      else stopPolling();
      const { job } = await getJobFn({ data: { jobId: activeJob.id } });
      setActiveJob(job as JobRow);
      await refreshList();
    } catch (e: any) { setError(e.message); }
  }

  function pct(j: JobRow) {
    if (!j.total) return 0;
    return Math.round((j.cursor / j.total) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/dev/objects" className="rounded p-1 hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Importar cliente Tibia 7.4</h1>
          <p className="text-xs text-slate-400">
            Upload &rarr; job persistido no banco. Fecha a aba, volta depois, ele retoma do último objeto.
          </p>
        </div>
      </div>

      {error && (
        <div className="dev-panel border-red-500/40 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Active job panel */}
      {activeJob && activeJob.status !== "completed" && (
        <div className="dev-panel space-y-3 p-3">
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase text-slate-400">Job atual</div>
            <code className="text-[10px] text-slate-500">{activeJob.id.slice(0, 8)}</code>
            <span className={`ml-auto rounded px-2 py-0.5 text-[10px] uppercase ${
              activeJob.status === "running" ? "bg-emerald-500/20 text-emerald-300" :
              activeJob.status === "paused" ? "bg-amber-500/20 text-amber-300" :
              activeJob.status === "failed" ? "bg-red-500/20 text-red-300" :
              "bg-slate-500/20 text-slate-300"
            }`}>{activeJob.status}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct(activeJob)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div>Progresso: <b>{activeJob.cursor}/{activeJob.total}</b> ({pct(activeJob)}%)</div>
            <div>Inseridos: <b>{activeJob.objects_inserted}</b></div>
            <div>Atualizados: <b>{activeJob.objects_updated}</b></div>
            <div>Pulados: <b>{activeJob.objects_skipped}</b></div>
            <div>Sprites novos: <b>{activeJob.sprites_uploaded}</b></div>
          </div>
          {activeJob.error && (
            <div className="dev-inset p-2 text-xs text-red-300">Erro: {activeJob.error}</div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase text-slate-400">Batch</label>
            <Input type="number" className="w-20" value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(100, Number(e.target.value) || 20)))} />
            <div className="flex-1" />
            {activeJob.status === "running" ? (
              <Button size="sm" variant="outline" onClick={() => control("pause")}>
                <Pause className="mr-1 h-4 w-4" /> Pausar
              </Button>
            ) : (
              <Button size="sm" onClick={() => control("resume")}
                style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
                <Play className="mr-1 h-4 w-4" /> Retomar
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => control("cancel")}>
              <X className="mr-1 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* New import */}
      {(!activeJob || activeJob.status === "completed") && (
        <div className="dev-panel space-y-3 p-3">
          <div className="text-xs uppercase text-slate-400">Novo import</div>
          <div className="grid gap-3 md:grid-cols-3">
            <FileInput label="Tibia.dat" file={datFile} onFile={setDatFile} accept=".dat" />
            <FileInput label="Tibia.spr" file={sprFile} onFile={setSprFile} accept=".spr" />
            <FileInput label="items.otb (opcional)" file={otbFile} onFile={setOtbFile} accept=".otb" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {(["item", "outfit", "effect", "missile"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={cats[k]} onCheckedChange={(v) => setCats({ ...cats, [k]: !!v })} />
                {k}s
              </label>
            ))}
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase text-slate-400">Batch</label>
              <Input type="number" className="w-20" value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(100, Number(e.target.value) || 20)))} />
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={startNewImport} disabled={busy || !datFile || !sprFile}
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
              <Upload className="mr-1 h-4 w-4" /> {busy ? "Enviando…" : "Iniciar import"}
            </Button>
          </div>
          {uploadPct !== null && (
            <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Job history */}
      <div className="dev-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="text-xs uppercase text-slate-400">Jobs recentes</div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={refreshList}>
            <RotateCw className="mr-1 h-3 w-3" /> Atualizar
          </Button>
        </div>
        <div className="space-y-1 text-xs">
          {jobs.length === 0 && <div className="text-slate-500">Nenhum job ainda.</div>}
          {jobs.map((j) => (
            <button key={j.id} onClick={() => setActiveJob(j)}
              className="flex w-full items-center gap-3 rounded px-2 py-1 text-left hover:bg-slate-800">
              <code className="text-slate-500">{j.id.slice(0, 8)}</code>
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                j.status === "completed" ? "bg-emerald-500/20 text-emerald-300" :
                j.status === "running" ? "bg-sky-500/20 text-sky-300" :
                j.status === "paused" ? "bg-amber-500/20 text-amber-300" :
                j.status === "failed" ? "bg-red-500/20 text-red-300" :
                "bg-slate-500/20 text-slate-300"
              }`}>{j.status}</span>
              <span className="text-slate-400">{j.cursor}/{j.total}</span>
              <span className="text-slate-500">+{j.objects_inserted} / ~{j.objects_updated}</span>
              <span className="ml-auto text-slate-600">{new Date(j.created_at).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileInput({
  label, file, onFile, accept,
}: { label: string; file: File | null; onFile: (f: File | null) => void; accept: string }) {
  return (
    <div className="dev-inset p-3">
      <label className="mb-1 block text-[10px] uppercase text-slate-400">{label}</label>
      <input type="file" accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {file && (
        <div className="mt-1 text-xs text-slate-500">
          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
}
