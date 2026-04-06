export type CheckoutStep =
  | "CART"
  | "OTP_SENT"
  | "OTP_VERIFIED"
  | "ADDRESS_SAVED"
  | "PAYMENT_READY"
  | "PAYMENT_INITIATED"
  | "PARTIALLY_PAID"
  | "COMPLETED"
  | "FAILED";

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutDetails {
  checkoutSessionId: string;
  step: CheckoutStep;
  currency: string;
  phone?: string;
  email?: string;

  shopifyOrderId?: string | null;
  couponCode?: string | null;

  shippingAddress?: ShippingAddress | null;

  totals: {
    subtotalPaise: number;
    discountPaise: number;
    couponCode?: string | null;
    shippingPaise: number;
    taxPaise: number;
    totalPaise: number;
  };

  lineItems: {
    variant_id: number;
    quantity: number;
    unit_price_paise: number;
    compare_at_price_paise?: number | null;
    product_title: string;
    variant_title?: string | null;
    image?: string | null;
  }[];

  branding?: {
    storeName: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  };

  refundState?: string | null;
}