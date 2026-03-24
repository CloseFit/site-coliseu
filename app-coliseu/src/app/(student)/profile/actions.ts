"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sem sessão ativa" };

  const displayName = formData.get("display_name") as string;
  const bio = formData.get("bio") as string;
  const avatarUrl = formData.get("avatar_url") as string;

  const updates = {
    display_name: displayName,
    bio: bio,
    ...(avatarUrl && { avatar_url: avatarUrl }), // update apenas se existir uma nova
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: "Erro ao salvar perfil: " + error.message };
  }

  revalidatePath("/app");
  revalidatePath("/profile");
  return { success: true };
}
