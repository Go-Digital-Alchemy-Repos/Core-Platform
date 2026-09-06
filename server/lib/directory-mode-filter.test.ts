import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { directoryModeCondition, directoryModeSql } from "./directory-mode-filter";
import { DIRECTORY_MODE_PROFILE_ALIASES } from "@shared/types/directory-settings";

const dialect = new PgDialect();
describe("directory mode SQL", () => {
  for (const [mode, aliases] of Object.entries(DIRECTORY_MODE_PROFILE_ALIASES)) {
    it(`binds ${mode} aliases as individual IN parameters for listings and filter options`, () => {
      const query = dialect.sqlToQuery(directoryModeCondition(mode));
      expect(query.sql).toContain(" in (");
      expect(query.sql).not.toContain("ANY");
      expect(query.params).toEqual(aliases);
      const fragment = dialect.sqlToQuery(directoryModeSql(mode));
      expect(fragment.sql).toBe(`AND ${query.sql}`);
      expect(fragment.params).toEqual(aliases);
    });
  }
  it("omits the optional mode filter when no mode is supplied", () => {
    expect(dialect.sqlToQuery(directoryModeSql()).sql).toBe("");
  });
});
