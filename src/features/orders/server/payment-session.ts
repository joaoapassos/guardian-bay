import "server-only";

// Compatibility export for established payment callers. Lock authority belongs to auth.
export {
  type PaymentTransaction,
  withAuthenticatedTransaction as withPaymentSession,
} from "@/features/auth/server/with-session-transaction";
