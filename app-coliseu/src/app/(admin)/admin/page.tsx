"use client";

import { useState, useRef } from "react";
import { createStudent } from "../actions";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await createStudent(formData);
    
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: "Aluno matriculado com sucesso!" });
      formRef.current?.reset();
    }
    setLoading(false);
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Header Admin */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo-coliseu.svg" alt="Coliseu" style={{ height: "24px", opacity: 0.5 }} />
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.3px", color: "var(--text-2)" }}>
              COLISEU <span style={{ color: "var(--text-3)" }}>ADMIN</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", letterSpacing: "1px" }}>
          BALCÃO RECEPÇÃO
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "40px 32px", maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "32px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.5px", marginBottom: "32px" }}>
          Matricular <span style={{ color: "var(--red)" }}>Aluno</span>
        </h1>
        
        <div style={{
          background: "var(--surface)",
          padding: "40px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Dados de Acesso e Perfil</h2>
          
          <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>Nome Completo *</label>
                <input type="text" name="full_name" required placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>Nível Inicial do Aluno *</label>
                <select name="level" required style={{ appearance: "none" }}>
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>E-mail de Login *</label>
                <input type="email" name="email" required placeholder="aluno@email.com" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>Senha Inicial Temporária *</label>
                <input type="text" name="password" required placeholder="Ex: coliseu123" defaultValue="coliseu123" />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ maxWidth: "240px", padding: "16px 32px" }}>
                {loading ? "Matriculando..." : "Matricular Aluno ➔"}
              </button>
            </div>
          </form>

          {message && (
            <div style={{
              marginTop: "24px",
              padding: "16px 20px",
              borderRadius: "var(--radius-sm)",
              background: message.type === "error" ? "var(--red-dim)" : "rgba(46,213,115,0.1)",
              border: `1px solid ${message.type === "error" ? "rgba(227,27,35,0.3)" : "rgba(46,213,115,0.3)"}`,
              color: message.type === "error" ? "var(--red)" : "var(--green)",
              fontSize: "14px",
              fontWeight: 600,
            }}>
              {message.type === "error" ? "⚠️ " : "✅ "}
              {message.text}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
