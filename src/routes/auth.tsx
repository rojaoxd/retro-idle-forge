import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Retro Idle Forge" },
      { name: "description", content: "Entre no jogo ou crie sua conta e escolha o nome do personagem." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const nameSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[A-Za-z0-9_]+$/, "Apenas letras, números e _");

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = sanitizeRedirect(search.redirect) ?? "/";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirectTo });
    });
  }, [navigate, redirectTo]);

  return (
    <div
      className="grid min-h-screen place-items-center p-4"
      style={{ background: "var(--dev-bg)", color: "var(--dev-text)" }}
    >
      <div className="dev-panel w-full max-w-md space-y-4 p-6">
        <div className="space-y-1 text-center">
          <div className="text-2xl font-semibold" style={{ color: "var(--dev-text)" }}>
            Retro Idle Forge
          </div>
          <div className="text-xs text-slate-400">Entre no mundo ou crie seu personagem.</div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-4">
            <SignInForm onDone={() => navigate({ to: redirectTo })} />
          </TabsContent>
          <TabsContent value="signup" className="pt-4">
            <SignUpForm onDone={() => navigate({ to: redirectTo })} />
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-slate-500">
          <Link to="/" className="hover:underline">
            ← Voltar para o jogo
          </Link>
        </div>
      </div>
    </div>
  );
}

function sanitizeRedirect(r?: string): string | null {
  if (!r) return null;
  if (!r.startsWith("/") || r.startsWith("//")) return null;
  return r;
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {err && <div className="text-xs text-red-400">{err}</div>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        style={{ background: "var(--dev-accent)", color: "#052e2b" }}
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const nameCheck = nameSchema.safeParse(characterName);
    if (!nameCheck.success) {
      setErr(`Nome do personagem: ${nameCheck.error.issues[0].message}`);
      return;
    }
    if (password.length < 6) {
      setErr("Senha deve ter ao menos 6 caracteres.");
      return;
    }

    setLoading(true);

    // 1. Try sign up (if user already exists, try sign in instead so we can attach profile)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    let userId = signUpData?.user?.id ?? null;
    let session = signUpData?.session ?? null;

    if (signUpError) {
      setLoading(false);
      setErr(signUpError.message);
      return;
    }

    // If email confirmation is required, no session yet.
    if (!session) {
      setLoading(false);
      toast.success("Conta criada! Verifique seu email para confirmar e depois entre.");
      return;
    }

    // 2. Insert profile with character_name.
    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: userId, character_name: characterName });

      if (profileError) {
        setLoading(false);
        if (profileError.code === "23505") {
          setErr("Esse nome de personagem já está em uso. Escolha outro.");
        } else {
          setErr(profileError.message);
        }
        return;
      }
    }

    setLoading(false);
    toast.success(`Bem-vindo, ${characterName}!`);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="text"
        placeholder="Nome do personagem"
        value={characterName}
        onChange={(e) => setCharacterName(e.target.value)}
        required
        minLength={3}
        maxLength={20}
        autoComplete="username"
      />
      <div className="text-[10px] text-slate-500">3–20 caracteres. Letras, números e _.</div>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        type="password"
        placeholder="Senha (mín. 6)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        autoComplete="new-password"
      />
      {err && <div className="text-xs text-red-400">{err}</div>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        style={{ background: "var(--dev-accent)", color: "#052e2b" }}
      >
        {loading ? "Criando…" : "Criar personagem"}
      </Button>
    </form>
  );
}
