import { runPipeline } from "./pipeline.js";

async function main() {
  const categorySlug = process.argv[2] || null;
  const stats = await runPipeline({ categorySlug });
  console.log("Pipeline completed", stats);
}

main().catch((error) => {
  console.error("Pipeline failed", error);
  process.exitCode = 1;
});
