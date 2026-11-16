"use server";
import { revalidatePath } from "next/cache";
import { editAdminUser } from "../server/edit-admin-user";
import { requireSameOrigin } from "../server/require-same-origin";

export async function editAdminUserAction(
  _state: string,
  form: FormData,
): Promise<string> {
  try {
    await requireSameOrigin();
    const result = await editAdminUser({
      userId: form.get("userId"),
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!result.success) {
      if (result.code === "SELF")
        return "Você não pode editar a própria conta por aqui.";
      if (result.code === "DUPLICATE") return "Este e-mail já está cadastrado.";
      if (result.code === "INVALID_INPUT")
        return "Confira o nome, e-mail e os requisitos da senha.";
      if (result.code === "RATE_LIMITED")
        return "Muitas tentativas. Aguarde e tente novamente.";
      return "Não foi possível editar o usuário. Atualize a página e tente novamente.";
    }
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/[id]", "page");
    return "Usuário atualizado.";
  } catch {
    return "Não foi possível editar o usuário. Tente novamente.";
  }
}
