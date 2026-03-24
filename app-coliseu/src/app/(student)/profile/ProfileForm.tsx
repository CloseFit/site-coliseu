"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

export default function ProfileForm({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faz upload pro Storage e salva a URL pública temporariamente
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    // Anexa a URL do avatar caso exista
    if (avatarUrl) {
      formData.append("avatar_url", avatarUrl);
    }

    const res = await updateProfile(formData);
    
    if (res?.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    }
    setLoading(false);
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "24px",
    }}>
      
      {/* Exibição e Botão de Foto */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
        <div style={{
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          background: "var(--surface-2)",
          border: "2px dashed var(--border-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: "16px",
          fontSize: "32px",
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            "👤"
          )}
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={uploadAvatar} 
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="btn-icon"
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Alterar Foto"}
        </button>
      </div>

      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>
            Como você quer ser chamado
          </label>
          <input 
            type="text" 
            name="display_name" 
            defaultValue={profile?.display_name || ""} 
            placeholder="Ex: João Silva" 
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", marginBottom: "8px", letterSpacing: "1px" }}>
            Sua Biografia
          </label>
          <textarea 
            name="bio" 
            defaultValue={profile?.bio || ""} 
            rows={3}
            placeholder="Ex: Focando em LPO e calistenia." 
            style={{ resize: "none" }}
          />
        </div>

        {message && (
          <div style={{
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            background: message.type === "error" ? "var(--red-dim)" : "rgba(46,213,115,0.1)",
            border: `1px solid ${message.type === "error" ? "rgba(227,27,35,0.3)" : "rgba(46,213,115,0.3)"}`,
            color: message.type === "error" ? "var(--red)" : "var(--green)",
            fontSize: "13px",
            textAlign: "center"
          }}>
            {message.text}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? "Salvando..." : "Salvar Perfil"}
        </button>
      </form>
    </div>
  );
}
