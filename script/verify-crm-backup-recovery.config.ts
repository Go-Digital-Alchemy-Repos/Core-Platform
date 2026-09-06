import { defineConfig } from "vitest/config";
import base from "../vitest.config";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["script/fixtures/crm-backup-recovery.test.ts"],
    fileParallelism: false,
  },
});
