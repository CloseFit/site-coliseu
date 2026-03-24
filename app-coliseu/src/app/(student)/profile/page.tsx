import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
// Refreshes VSCode TS Cache
import ProfileForm from "./ProfileForm";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* Header */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <Link href="/app" className="btn-icon" style={{ padding: "8px 12px" }}>
            ← Voltar
          </Link>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "18px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.3px",
            flex: 1,
            textAlign: "center",
            paddingRight: "60px", // compensa o botão voltar p ficar centralizado
          }}>
            Configurar <span style={{ color: "var(--red)" }}>Perfil</span>
          </div>
        </div>
      </header>

      {/* Main Form Area */}
      <main style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        <ProfileForm user={user} profile={profile} />
      </main>

    </div>
  );
}
