import { readFile, writeFile } from "node:fs/promises";

const path = ".output/server/wrangler.json";
const config = JSON.parse(await readFile(path, "utf8"));

config.observability = {
  enabled: false,
  head_sampling_rate: 1,
  logs: {
    enabled: true,
    head_sampling_rate: 1,
    persist: true,
    invocation_logs: true,
  },
  traces: {
    enabled: false,
    persist: true,
    head_sampling_rate: 1,
  },
};

await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
