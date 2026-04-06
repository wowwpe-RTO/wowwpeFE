"use client";

import { CheckoutDetails } from "@/lib/types";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useCheckout } from "../contexts/CheckoutContext";

const OtpStep = dynamic(() => import("./OtpStep"), { ssr: false });
const AddressStep = dynamic(() => import("./AddressStep"), { ssr: false });
const PaymentStep = dynamic(() => import("./PaymentStep"), { ssr: false });

interface Props {
  details: CheckoutDetails;
  refresh: () => Promise<void>;
  shop: string;
  setCanContinue: (v: boolean) => void;
  registerContinue: (fn: () => void) => void;
}

export default function StepRenderer({
  details,
  refresh,
  shop,
  setCanContinue,
  registerContinue,
}: Props) {
  const sessionId = details.checkoutSessionId;
  const { previousAddresses } = useCheckout();

  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 200);
    return () => clearTimeout(timer);
  }, [details.step]);

  if (transitioning) return <LoadingStep />;

  return (
    <Suspense fallback={<LoadingStep />}>

      {details.step === "OTP_SENT" && (
        <OtpStep details={details} refresh={refresh} />
      )}

      {(details.step === "OTP_VERIFIED" ||
        details.step === "ADDRESS_SAVED") && (
        <AddressStep
          sessionId={sessionId}
          onSaved={refresh}
          setCanContinue={setCanContinue}
          registerContinue={registerContinue}
          previousAddresses={previousAddresses}
        />
      )}

      {(details.step === "PAYMENT_READY" ||
        details.step === "PAYMENT_INITIATED" ||
        details.step === "COMPLETED") && (
        <PaymentStep
          sessionId={sessionId}
          details={details}
          refresh={refresh}
        />
      )}

    </Suspense>
  );
}

function LoadingStep() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
    </div>
  );
}