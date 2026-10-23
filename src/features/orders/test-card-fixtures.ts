// Deliberately synthetic numbers, not valid bank PANs. Public fixtures only.
export const testCardFixtures = [
  { id: "test-1", number: "0000000000000001", cvv: "111", last4: "0001" },
  { id: "test-2", number: "0000000000000002", cvv: "222", last4: "0002" },
  { id: "test-3", number: "0000000000000003", cvv: "333", last4: "0003" },
] as const;

export function recognizeTestCard(number: string, cvv: string) {
  const normalized = number.replaceAll(" ", "");
  return testCardFixtures.find(
    (fixture) => fixture.number === normalized && fixture.cvv === cvv,
  );
}
