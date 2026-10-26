import { parseProductOptions } from "./seeder/products-options.mjs";

try {
  const options = parseProductOptions(process.argv.slice(2));
  if (options.dryRun) {
    console.info(
      JSON.stringify({
        count: options.resume ? "checkpoint" : options.count,
        max: 1000,
        default: 200,
        resume: options.resume ?? null,
        stock: "0–1000",
        mode: "dry-run: sem rede ou banco",
      }),
    );
  } else {
    const { localDemoDatabase, loadLocalEnvironment } = await import(
      "./local-demo-environment.mjs"
    );
    await loadLocalEnvironment();
    const url = localDemoDatabase();
    const { seedCheckpoint, createSeedState } = await import(
      "./seeder/checkpoint.mjs"
    );
    const { createProductWriter } = await import(
      "./seeder/persist-products.mjs"
    );
    const { runProductSeed } = await import("./seeder/run-products.mjs");
    const controller = new AbortController();
    const interrupt = () => controller.abort();
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    let writer;
    try {
      const checkpoint = seedCheckpoint();
      const state = options.resume
        ? await checkpoint.load(options.resume)
        : createSeedState(options);
      writer = await createProductWriter(url);
      await checkpoint.save(state);
      console.info(`Execução ${state.runId}: até ${state.count} produtos.`);
      const result = await runProductSeed({
        state,
        writer,
        checkpoint,
        signal: controller.signal,
      });
      console.info(
        `Resultado: ${result.reason}. Solicitados:${result.count}; criados:${result.created}; descartados:${0}; pendentes:${Math.max(0, result.count - result.created)}.`,
      );
      if (result.reason !== "COMPLETE") {
        console.info(
          `Retome: npm run seeder:products -- --resume ${result.runId}`,
        );
        process.exitCode = 1;
      }
    } finally {
      await writer?.close();
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
    }
  }
} catch {
  console.error(
    "Seeder interrompido. Confira quantidade1–1000, configuração local, migrations, checkpoint; credenciais omitidas. Use --dry-run para conferir argumentos.",
  );
  process.exitCode = 1;
}
