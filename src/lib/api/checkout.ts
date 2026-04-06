import { api } from "../api";

export function getCheckoutDetails(sessionId: string) {
  return api(`/checkout/details/${sessionId}`);
}