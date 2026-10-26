import { describe, expect, it } from "vitest";
import { formatPostalCode } from "./postal-code";
import { addressSnapshotSchema } from "./schemas/address";

describe("postal code input", () => {
  it("preserves all eight digits with or without a separator", () => {
    expect(formatPostalCode("12345678")).toBe("12345-678");
    expect(formatPostalCode("12345-678")).toBe("12345-678");
    expect(formatPostalCode("01234567")).toBe("01234-567");
    expect(
      addressSnapshotSchema.shape.postalCode.parse(
        formatPostalCode("01234567"),
      ),
    ).toBe("01234567");
  });
  it("does not turn incomplete or excessive input into a valid CEP", () => {
    for (const value of ["1234567", "123456789"]) {
      expect(
        addressSnapshotSchema.shape.postalCode.safeParse(
          formatPostalCode(value),
        ).success,
      ).toBe(false);
    }
    expect(formatPostalCode("")).toBe("");
    expect(formatPostalCode("12345")).toBe("12345");
  });
});
