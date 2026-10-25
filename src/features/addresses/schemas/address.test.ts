import { describe, expect, it } from "vitest";
import {
  addressReferenceSchema,
  addressSnapshotSchema,
  updateAddressSchema,
} from "./address";

const input = {
  recipient: " Ana ",
  postalCode: "12345-678",
  street: "Rua das Flores",
  number: "s/n",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};
describe("Brazilian addresses", () => {
  it("normalizes CEP and trims recipient while preserving Brazilian text", () => {
    expect(addressSnapshotSchema.parse(input)).toMatchObject({
      postalCode: "12345678",
      recipient: "Ana",
      city: "São Paulo",
    });
  });
  it("rejects client authority, unknown fields, unsupported country and invalid state", () => {
    for (const patch of [
      { userId: "owner" },
      { principal: true },
      { state: "XX" },
      { country: "US" },
      { postalCode: "123" },
      { postalCode: "12345x678" },
      { recipient: " " },
      { street: "a".repeat(161) },
    ]) {
      expect(
        addressSnapshotSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
    }
  });
  it("requires an optimistic revision and UUID for edits and removals", () => {
    const ref = { id: "00000000-0000-4000-8000-000000000001", revision: 1 };
    expect(updateAddressSchema.safeParse({ ...input, ...ref }).success).toBe(
      true,
    );
    expect(addressReferenceSchema.safeParse(ref).success).toBe(true);
    for (const revision of [0, -1, 1.5, "1", 2147483647])
      expect(
        addressReferenceSchema.safeParse({ ...ref, revision }).success,
      ).toBe(false);
    expect(updateAddressSchema.safeParse(input).success).toBe(false);
    expect(
      addressReferenceSchema.safeParse({ ...ref, userId: "owner" }).success,
    ).toBe(false);
  });
});
