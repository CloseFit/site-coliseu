import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../../(auth)/actions";
import Link from "next/link";

export default async function AppDashboard() {
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

  const { data: alerts } = await supabase
    .from("health_alerts")
    .select("*")
    .eq("student_id", user.id)
    .eq("is_resolved", false);

  const memberNum = String(profile?.member_number || 0).padStart(2, "0");
  const xp = profile?.xp_balance || 0;
  const xpProgress = Math.min((xp / 1000) * 100, 100);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ============================
          HEADER — Idêntico ao Admin
          ============================ */}
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
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/logo-coliseu.svg" alt="Coliseu" style={{ height: "28px" }} />
            <div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "18px",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "-0.3px",
              }}>
                COLISEU <span style={{ color: "var(--red)" }}>CLUBE</span>
              </div>
              <div style={{
                fontSize: "11px",
                color: "var(--text-3)",
                fontWeight: 500,
                textTransform: "uppercase" as const,
                letterSpacing: "1px",
              }}>
                Área do Membro
              </div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn-icon">
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* ============================
          MAIN CONTENT
          ============================ */}
      <main style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        {/* ============================
            CARD: IDENTIDADE DIGITAL
            ============================ */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          {/* Barra vermelha no topo */}
          <div style={{
            height: "3px",
            background: "var(--red)",
            boxShadow: "0 0 20px var(--red-glow)",
          }} />

          <div style={{
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            {/* Avatar */}
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              flexShrink: 0,
              background: "var(--red-dim)",
              border: "2px solid rgba(227, 27, 35, 0.3)",
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar"
                     style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                "👤"
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {profile?.display_name || profile?.full_name || "Novo Membro"}
              </h2>
              <p style={{
                color: "var(--text-2)",
                fontSize: "13px",
                marginTop: "2px",
              }}>
                {profile?.bio || "Toque para editar sua bio"}
              </p>

              {/* Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.5px",
                  background: "var(--red-dim)",
                  color: "var(--red)",
                  border: "1px solid rgba(227,27,35,0.25)",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  #{memberNum}
                </span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.5px",
                  background: "rgba(46, 213, 115, 0.1)",
                  color: "var(--green)",
                  border: "1px solid rgba(46, 213, 115, 0.25)",
                }}>
                  {profile?.level || "Iniciante"}
                </span>
              </div>
              
              <div style={{ marginTop: "12px" }}>
                <Link href="/profile" style={{
                  fontSize: "11px",
                  color: "var(--text)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.5px",
                }}>
                  ✏️ Editar Perfil
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ============================
            STATS ROW — Grid igual ao Admin
            ============================ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}>
          {/* XP Card */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "20px",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "1px",
              color: "var(--text-3)",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              ⚡ Experiência
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "32px",
                fontWeight: 900,
                color: "var(--red)",
                lineHeight: 1,
              }}>
                {xp}
              </span>
              <span style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase" as const,
              }}>
                XP
              </span>
            </div>
            {/* Barra de progresso */}
            <div style={{
              marginTop: "12px",
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${xpProgress}%`,
                height: "100%",
                borderRadius: "2px",
                background: "var(--red)",
                boxShadow: "0 0 10px var(--red-glow)",
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
          </div>

          {/* Membro Desde */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "20px",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "1px",
              color: "var(--text-3)",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              🏛️ Membro
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "32px",
              fontWeight: 900,
              color: "var(--text)",
              lineHeight: 1,
            }}>
              #{memberNum}
            </div>
            <div style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "var(--text-3)",
            }}>
              Fundador do Clube
            </div>
          </div>
        </div>

        {/* ============================
            ALERTAS DE SAÚDE
            ============================ */}
        {alerts && alerts.length > 0 && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid rgba(255, 193, 7, 0.3)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span>⚠️</span>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "1px",
                color: "var(--yellow)",
              }}>
                Cartão de Alerta
              </span>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {alerts.map((alert: { id: string; description: string; severity: string }) => (
                <div key={alert.id} style={{
                  fontSize: "13px",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 193, 7, 0.06)",
                  border: "1px solid rgba(255, 193, 7, 0.12)",
                  color: "var(--text-2)",
                }}>
                  {alert.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================
            CONQUISTAS
            ============================ */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "20px",
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
            color: "var(--text-3)",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            🏆 Conquistas
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
          }}>
            {["🔥", "💪", "🎯", "⚡"].map((emoji, i) => (
              <div key={i} style={{
                aspectRatio: "1",
                borderRadius: "var(--radius-sm)",
                background: i === 0 ? "var(--red-dim)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${i === 0 ? "rgba(227,27,35,0.25)" : "var(--border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                opacity: i === 0 ? 1 : 0.3,
              }}>
                {emoji}
              </div>
            ))}
          </div>
          <p style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "var(--text-3)",
          }}>
            Evolua seus treinos para desbloquear conquistas.
          </p>
        </div>

        {/* ============================
            FOOTER
            ============================ */}
        <p style={{
          textAlign: "center",
          fontSize: "11px",
          color: "var(--text-3)",
          textTransform: "uppercase" as const,
          letterSpacing: "1.5px",
          fontWeight: 700,
          padding: "16px 0",
        }}>
          Coliseu Clube · {new Date().getFullYear()}
        </p>

      </main>
    </div>
  );
}
