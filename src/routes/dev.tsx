import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/dev/admin.functions";
import { DevSidebar } from "@/components/dev/DevSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dev")({
  ssr: false,
  component: DevLayout,
});

type Status = "loading" | "unauth" | "not-admin" | "ok";

function DevLayout() {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const checkAdmin = useServerFn(checkIsAdmin);

  async function check() {
    setStatus("loading");
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setStatus("unauth");
      return;
    }
    setEmail(userRes.user.email ?? null);
    try {
      const r = await checkAdmin();
      if (r.isAdmin) setStatus("ok");
      else setStatus("not-admin");
    } catch (e: any) {
      setErr(e.message);
      setStatus("not-admin");
    }
  }

  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return <FullScreenCenter>Carregando painel…</FullScreenCenter>;
  }

  if (status === "unauth") {
    return <FullScreenCenter><SignInForm onSignedIn={check} /></FullScreenCenter>;
  }

  if (status === "not-admin") {
    return (
      <FullScreenCenter>
        <div className="dev-panel max-w-md space-y-3 p-6 text-center">
          <div className="text-xl font-semibold text-slate-100">Acesso negado</div>
          <div className="text-sm text-slate-400">
            Sua conta ({email}) não tem a role <code>admin</code>. Peça a um administrador
            para conceder acesso ou execute no SQL Editor:
          </div>
          <pre className="dev-inset overflow-x-auto p-3 text-left text-xs text-slate-300">
{`INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE email = '${email ?? "seu-email@exemplo.com"}';`}
          </pre>
          {err && <div className="text-xs text-red-400">{err}</div>}
          <Button variant="secondary" onClick={check}>Verificar novamente</Button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut().then(check)}
            className="block w-full text-xs text-slate-500 hover:underline"
          >
            Sair
          </button>
        </div>
      </FullScreenCenter>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--dev-bg)", color: "var(--dev-text)" }}>
      <DevSidebar email={email} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

function FullScreenCenter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid min-h-screen place-items-center p-4"
      style={{ background: "var(--dev-bg)", color: "var(--dev-text)" }}
    >
      {children}
    </div>
  );
}

function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.bind(supabase.auth)({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else onSignedIn();
  }

  return (
    <form onSubmit={submit} className="dev-panel w-full max-w-sm space-y-3 p-6">
      <div className="text-xl font-semibold" style={{ color: "var(--dev-text)" }}>
        Engine Console
      </div>
      <div className="text-xs text-slate-400">
        Entre para acessar o Painel de Desenvolvedor.
      </div>
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <div className="text-xs text-red-400">{err}</div>}
      <Button type="submit" disabled={loading} className="w-full" style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
        {loading ? "…" : mode === "signin" ? "Entrar" : "Criar conta"}
      </Button>
      <button
        type="button"
        className="w-full text-xs text-slate-400 hover:underline"
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
      >
        {mode === "signin" ? "Criar nova conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
