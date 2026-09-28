import type { Realness } from "../types";

export type DriverId = "mock" | "stripe";

export interface CheckoutInput {
  orderId: string;
  orderNumber: string;
  amountHkdCents: number;
  description: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SetupInput {
  commitmentId: number;
  email: string;
  customerRef: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface AuthorizeInput {
  customerRef: string | null;
  paymentMethodRef: string;
  amountHkdCents: number;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

export type NormalizedEventType =
  | "CHECKOUT_PAID"
  | "SETUP_COMPLETED"
  | "DISPUTE_OPENED"
  | "REFUNDED"
  | "IGNORED";

export interface NormalizedEvent {
  eventId: string;
  type: NormalizedEventType;
  realness: Realness;
  sessionId?: string;
  paymentRef?: string;
  customerRef?: string;
  paymentMethodRef?: string;
  amountHkdCents?: number;
  metadata: Record<string, string>;
}

export interface PaymentProvider {
  id: DriverId;
  createCheckout(input: CheckoutInput): Promise<{ sessionId: string; redirectUrl: string }>;
  createSetup(input: SetupInput): Promise<{ sessionId: string; redirectUrl: string; customerRef: string | null }>;
  /** Off-session hold (capture later). Declines are a result, not an exception. */
  authorize(input: AuthorizeInput): Promise<{ ref: string; status: "AUTHORIZED" | "DECLINED"; message?: string }>;
  capture(ref: string, amountHkdCents: number): Promise<{ status: "SUCCEEDED" | "FAILED"; message?: string }>;
  cancelAuthorization(ref: string): Promise<void>;
  refund(paymentRef: string, amountHkdCents: number): Promise<{ ref: string; status: "SUCCEEDED" | "PENDING" | "FAILED" }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent | null>;
}
