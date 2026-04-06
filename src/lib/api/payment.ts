import { api } from "../api";

interface InitPaymentResponse {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  key: string;
}

export function initPayment(payload: {
  checkoutSessionId: string;
  gateway: "razorpay";
  paymentMethod: string;
}) {
  return api<InitPaymentResponse>("/checkout/pay/init", {
    method: "POST",
    body: JSON.stringify({
      checkoutSessionId: payload.checkoutSessionId,
      gateway: payload.gateway,
      paymentMethod: payload.paymentMethod,
    }),
  });
}