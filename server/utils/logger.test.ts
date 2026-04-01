import { describe, it, expect } from "vitest";
import { formatEntry } from "./logger";

describe("formatEntry", () => {
  it("includes timestamp, level, source, and message", () => {
    const output = formatEntry({ level: "info", source: "test", msg: "hello world" });
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(output).toContain("[INFO]");
    expect(output).toContain("[test]");
    expect(output).toContain("hello world");
  });

  it("uppercases the level", () => {
    const output = formatEntry({ level: "error", source: "app", msg: "fail" });
    expect(output).toContain("[ERROR]");
  });

  it("appends extra context as JSON", () => {
    const output = formatEntry({ level: "warn", source: "db", msg: "slow", duration: 1500 });
    expect(output).toContain("[WARN]");
    expect(output).toContain('"duration":1500');
  });

  it("omits context string when no extra fields exist", () => {
    const output = formatEntry({ level: "info", source: "http", msg: "ok" });
    const afterMsg = output.split("ok")[1];
    expect(afterMsg?.trim()).toBe("");
  });
});
