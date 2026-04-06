import { api } from "../api";

export function calculateShipping(
  checkoutSessionId: string,
  pincode: string
) {
  return api("/checkout/shipping/calculate", {
    method: "POST",
    body: JSON.stringify({
      checkoutSessionId,
      pincode,
    }),
  });
}