"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminUser } from "../server/create-admin-user";
import { requireSameOrigin } from "../server/require-same-origin";

export async function createAdminUserAction(
  _state: string,
  form: FormData,
): Promise<string> {
  let id: string;
  try {
    await requireSameOrigin();
    const result = await createAdminUser({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!result.success) {
      if (result.code === "DUPLICATE") return "Este e-mail já está cadastrado.";
      if (result.code === "INVALID_INPUT")
        return "Confira o nome, e-mail e os requisitos da senha.";
      if (result.code === "RATE_LIMITED")
        return "Muitas tentativas. Aguarde e tente novamente.";
      return "Acesso negado. Entre novamente e tente outra vez.";
    }
    id = result.id;
    revalidatePath("/admin/users");
    revalidatePath("/admin");
  } catch {
    return "Não foi possível cadastrar o usuário. Tente novamente.";
  }
  redirect(`/admin/users/${id}`);
}
