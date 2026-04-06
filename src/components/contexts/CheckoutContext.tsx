"use client";

import { createContext, useContext } from "react";
import { CheckoutDetails } from "@/lib/types";

export interface PreviousAddress {
  firstName: string;
  lastName?: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
}

interface CheckoutContextType {
  details: CheckoutDetails | null;
  refreshCheckout: () => Promise<void>;
  previousAddresses: PreviousAddress[];
  setPreviousAddresses: (addresses: PreviousAddress[]) => void;
}

export const CheckoutContext = createContext<CheckoutContextType>({
  details: null,
  refreshCheckout: async () => {},
  previousAddresses: [],
  setPreviousAddresses: () => {},
});

export const useCheckout = () => useContext(CheckoutContext);