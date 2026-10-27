import { describe, expect, test } from "bun:test";
import { parseHandoffVerification } from "../core/handoff.ts";

describe("canonical verification remains authoritative when empty", () => {
  test("empty canonical verdict cannot inherit legacy pass", () => {
    expect(
      parseHandoffVerification("## Verification\n\n## Verdict\npass\n")
    ).toBeNull();
  });
  test("empty terminal canonical section cannot inherit earlier legacy pass", () => {
    expect(
      parseHandoffVerification("## Verdict\npass\n\n## Verification\n")
    ).toBeNull();
  });
  test("legacy-only verdict remains supported", () => {
    expect(parseHandoffVerification("## Verdict\npass\n")).toBe(
      "type-check-only"
    );
  });
  test("recognized canonical verdict retains precedence", () => {
    expect(
      parseHandoffVerification(
        "## Verification\nverifier-blocked\n\n## Verdict\npass\n"
      )
    ).toBe("verifier-blocked");
  });
});
