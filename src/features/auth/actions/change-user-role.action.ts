"use server";
import { revalidatePath } from "next/cache";
import { changeAdminUserRole } from "../server/admin-users";
import { requireSameOrigin } from "../server/require-same-origin";

export async function changeUserRoleAction(
  _state: string,
  form: FormData,
): Promise<string> {
  try {
    await requireSameOrigin();
    const result = await changeAdminUserRole({
      userId: form.get("userId"),
      role: form.get("role"),
    });
    if (!result.success) {
      if (result.code === "SELF")
        return "Você não pode alterar o próprio cargo.";
      if (result.code === "LAST_ADMIN")
        return "É necessário manter um administrador.";
      return "Não foi possível alterar o cargo. Atualize a página e tente novamente.";
    }
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/[id]", "page");
    return "Cargo salvo.";
  } catch {
    return "Não foi possível alterar o cargo. Tente novamente.";
  }
}
