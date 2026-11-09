"use server";
import { revalidatePath } from "next/cache";
import { manageAdminUser } from "../server/admin-users";
import { requireSameOrigin } from "../server/require-same-origin";

export async function manageUserAction(
  _state: string,
  form: FormData,
): Promise<string> {
  try {
    await requireSameOrigin();
    const result = await manageAdminUser({
      userId: form.get("userId"),
      operation: form.get("operation"),
    });
    if (!result.success)
      return "Não foi possível atualizar a conta. Recarregue e tente novamente.";
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/[id]", "page");
    return "Operação concluída.";
  } catch {
    return "Não foi possível atualizar a conta.";
  }
}
