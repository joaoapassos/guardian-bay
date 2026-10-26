export function parseProductOptions(args) {
  let count = 200,
    resume,
    dryRun = false,
    provided = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--resume") {
      resume = args[++i];
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          resume ?? "",
        )
      )
        throw new Error("Resume exige UUID válido.");
      continue;
    }
    if (
      arg.startsWith("--") ||
      provided ||
      !/^\d+$/.test(arg) ||
      Number(arg) < 1 ||
      Number(arg) > 1000
    )
      throw new Error("Quantidade deve ser um inteiro de1a1000; padrão200.");
    count = Number(arg);
    provided = true;
  }
  if (resume && provided)
    throw new Error(
      "Resume utiliza quantidade do checkpoint; não combine novos valores.",
    );
  return { count, resume, dryRun };
}
