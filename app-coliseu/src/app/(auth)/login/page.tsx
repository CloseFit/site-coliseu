"use client";

import { useState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      {/* Auth Box — Idêntico ao admin */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: "24px",
        padding: "60px 48px",
        textAlign: "center",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
      }}>

        {/* Logo */}
        <img
          src="/logo-coliseu.svg"
          alt="Coliseu"
          style={{ height: "64px", marginBottom: "16px" }}
        />

        {/* Subtítulo */}
        <p style={{
          color: "var(--text-2)",
          fontSize: "14px",
          marginTop: "4px",
          marginBottom: "32px",
        }}>
          Acesso exclusivo para membros do Clube
        </p>

        {/* Formulário */}
        <form action={handleSubmit} style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <input
            type="email"
            name="email"
            placeholder="Seu e-mail"
            required
            autoComplete="email"
          />
          <input
            type="password"
            name="password"
            placeholder="Sua senha"
            required
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <svg style={{ animation: "spin 1s linear infinite", height: "16px", width: "16px" }} viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : (
              "Entrar no Clube"
            )}
          </button>
        </form>

        {/* Erro */}
        {error && (
          <p style={{
            marginTop: "16px",
            fontSize: "12px",
            color: "var(--red)",
            minHeight: "16px",
          }}>
            {error}
          </p>
        )}

        {/* Rodapé */}
        <p style={{
          marginTop: "32px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          fontWeight: 700,
          color: "var(--text-3)",
        }}>
          Coliseu Clube · Acesso Restrito
        </p>
      </div>

      {/* Animação do spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
