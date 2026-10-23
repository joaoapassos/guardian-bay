import { expect, it } from "vitest";
import { recognizeTestCard } from "../test-card-fixtures";
import { saveTestCardSchema } from "./test-card";

it("accepts only explicit synthetic fixtures; rejects raw financial fields", () => {
  expect(recognizeTestCard("0000 0000 0000 0001", "111")?.id).toBe("test-1");
  expect(recognizeTestCard("4111111111111111", "111")).toBeUndefined();
  expect(recognizeTestCard("0000000000000001", "123")).toBeUndefined();
  const valid = { fixtureId: "test-1", expiryMonth: 12, expiryYear: 2099 };
  expect(saveTestCardSchema.safeParse(valid).success).toBe(true);
  for (const field of ["pan", "cvv", "userId", "brand", "last4", "holder"])
    expect(
      saveTestCardSchema.safeParse({ ...valid, [field]: "untrusted" }).success,
    ).toBe(false);
});
