import { randomUUID } from "node:crypto";
import { databaseUrl } from "./environment.mjs";
import { run } from "./runner.mjs";
import { saveInstallation } from "./state.mjs";
import { readTerminalSecret } from "./terminal-secret.mjs";

async function adminOperation(context, input) {
  const { options, secrets, release } = context;
  const result = await run(
    "runuser",
    [
      "-u",
      "guardian-bay-migrate",
      "--",
      release.tools.node,
      "scripts/system/provision-admin.mjs",
    ],
    {
      cwd: release.directory,
      input: JSON.stringify(input),
      capture: true,
      allowFailure: true,
      env: {
        ...release.env,
        MIGRATION_DATABASE_URL: databaseUrl(
          "guardian_bay_migrator",
          secrets.migratorPassword,
          options.dbPort,
        ),
      },
    },
  );
  let data;
  try {
    data = JSON.parse(result.output);
  } catch {
    throw new Error(
      "Provisionamento administrativo falhou; detalhes sensíveis omitidos.",
    );
  }
  if (result.code !== 0 || !data.success)
    throw new Error(
      data.code === "EXISTS"
        ? "E-mail já cadastrado; não houve promoção ou troca de senha."
        : "Provisionamento administrativo falhou. Senha deve ter1–128 caracteres Unicode válidos; não há regra de força no bootstrap.",
    );
  return data;
}
export async function prepareAdmin(context) {
  const { options, state } = context;
  const inspection = await adminOperation(context, {
    mode: "inspect",
    email: options.adminEmail,
  });
  const expected = state.adminId ?? state.adminPlannedId;
  if (inspection.user) {
    if (inspection.user.id !== expected || inspection.user.role !== "admin")
      throw new Error(
        "E-mail já existe e não corresponde ao admin inicial ativo. Não será promovido, redefinido ou adotado.",
      );
    state.adminId = inspection.user.id;
    await saveInstallation(state);
    console.info("[Admin] Acesso inicial já provisionado; senha preservada.");
    return;
  }
  if (state.adminId)
    throw new Error(
      "Admin inicial ausente. Recuperação exige operação explícita; conta não será recriada silenciosamente.",
    );
  if (!state.adminPlannedId) {
    state.adminPlannedId = randomUUID();
    await saveInstallation(state);
  }
  console.info(
    `[Admin] Criando ${options.adminEmail}. A senha é recebida sem trim e sem política de força.`,
  );
  let password = await readTerminalSecret();
  try {
    const result = await adminOperation(context, {
      mode: "create",
      email: options.adminEmail,
      id: state.adminPlannedId,
      password,
    });
    state.adminId = result.id;
    await saveInstallation(state);
    console.info("[Admin] Acesso inicial criado.");
  } finally {
    password = "";
  }
}
