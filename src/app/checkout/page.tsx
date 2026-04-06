"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CheckoutDetails } from "@/lib/types";

import CheckoutShell from "@/components/checkout/CheckoutShell";
import OrderSummary from "@/components/checkout/OrderSummary";
import StepRenderer from "@/components/checkout/StepRenderer";
import PhoneStep from "@/components/checkout/PhoneStep";
import CheckoutUpsell from "@/components/checkout/CheckoutUpsell";
import CouponBanner from "@/components/checkout/CouponBanner";
import CouponView from "@/components/checkout/CouponView";
import DeliveryBanner from "@/components/checkout/DeliveryBanner";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import Spinner from "@/components/ui/Spinner";
import { CheckoutContext } from "@/components/contexts/CheckoutContext";
import type { PreviousAddress } from "@/components/contexts/CheckoutContext";

export const dynamic = 'force-dynamic';
export default function CheckoutPage() {

  const searchParams = useSearchParams();

  const shop = searchParams.get("shop") || "";
  const sessionParam = searchParams.get("session");

  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const [canContinue, setCanContinue] = useState(false);
  const [continueHandler, setContinueHandler] = useState<
    (() => Promise<void> | void) | null
  >(null);
  const [ctaLoading, setCtaLoading] = useState(false);

  const [leftView, setLeftView] = useState<"summary" | "coupons">("summary");
  const [previousAddresses, setPreviousAddresses] = useState<PreviousAddress[]>([]);


  const fetchDetails = useCallback(async () => {
    if (!sessionParam) return;
    try {
      const res = await api<CheckoutDetails>(
        `/checkout/details/${sessionParam}`
      );
      setDetails(res);
    } catch (err) {
      console.error("Failed to load checkout:", err);
    }
  }, [sessionParam]);

  useEffect(() => {
    if (!sessionParam) return;
    setLoading(true);
    fetchDetails().finally(() => setLoading(false));
  }, [sessionParam, fetchDetails]);

  /* --------------------------------------------------
     STEP MAPPING
  -------------------------------------------------- */

  const currentStep = details?.step;

  const progressStep: "summary" | "address" | "payment" =
    !currentStep ||
    currentStep === "CART" ||
    currentStep === "OTP_SENT"
      ? "summary"
      : currentStep === "OTP_VERIFIED" ||
        currentStep === "ADDRESS_SAVED"
      ? "address"
      : "payment";

  /* --------------------------------------------------
     MOBILE BACK NAVIGATION
  -------------------------------------------------- */

  const showBack =
    !!currentStep &&
    currentStep !== "CART" &&
    currentStep !== "COMPLETED" &&
    currentStep !== "FAILED";

  function handleClose() {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  }

  async function handleBack() {
    if (!details?.checkoutSessionId) return;
    try {
      await api("/checkout/step/back", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId: details.checkoutSessionId }),
      });
      await fetchDetails();
    } catch (err) {
      console.error("Back failed", err);
    }
  }

  /* --------------------------------------------------
     FOOTER CTA
     - Desktop: w-40 h-12, right-aligned (unchanged)
     - Mobile: full width, rounded-2xl
  -------------------------------------------------- */

  const showFooter =
    currentStep === "CART" ||
    currentStep === "OTP_VERIFIED" ||
    currentStep === "ADDRESS_SAVED";

  const handleFooterClick = async () => {
    if (!continueHandler) return;
    try {
      setCtaLoading(true);
      await continueHandler();
    } finally {
      setCtaLoading(false);
    }
  };

  const footerCTA = showFooter ? (
    <button
      onClick={handleFooterClick}
      disabled={!canContinue || ctaLoading}
      className={`
        relative font-semibold text-white transition
        flex items-center justify-center
        w-full h-14 rounded-2xl
        md:w-full md:h-12 md:rounded-xl
        lg:w-40 lg:h-12 lg:rounded-xl
        ${canContinue && !ctaLoading
          ? "bg-[#0B7E63] hover:bg-green-700"
          : "bg-gray-300 cursor-not-allowed"
        }
      `}
    >
      {ctaLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={18} />
        </span>
      )}
      <span className={`transition-opacity duration-200 ${ctaLoading ? "opacity-0" : "opacity-100"}`}>
        Continue
      </span>
    </button>
  ) : null;

  /* --------------------------------------------------
     LEFT PANEL CONTENT (summary, coupon banner, upsell)
     Shared between desktop left panel and mobile top section
  -------------------------------------------------- */

  const leftContent = (
    <>
      <DeliveryBanner />

      <div className={leftView === "summary" ? "block" : "hidden"}>

        {details?.step === "COMPLETED" ? (
          <OrderSummary
            checkoutSessionId={null}
            details={details}
            mode="final"
          />
        ) : (
          sessionParam && (
            <OrderSummary
              checkoutSessionId={sessionParam}
              mode="preview"
            />
          )
        )}

        <div className="mt-4">
          <CouponBanner
            onClick={() => setLeftView("coupons")}
            checkoutSessionId={details?.checkoutSessionId}
          />
        </div>

        <div className="mt-4">
          <CheckoutUpsell
            shop={shop}
            checkoutSessionId={details?.checkoutSessionId}
          />
        </div>

      </div>

      {leftView === "coupons" && (
        <CouponView
          checkoutSessionId={details?.checkoutSessionId}
          onBack={() => setLeftView("summary")}
        />
      )}
    </>
  );

  /* --------------------------------------------------
     RIGHT PANEL CONTENT (step forms)
  -------------------------------------------------- */

  const rightContent = (
    <div className="flex flex-col h-full">
      {loading || (sessionParam && !details) ? (
        <div className="p-8" />
      ) : !sessionParam ? (
        <div className="p-8 text-center text-red-500">
          No session found
        </div>
      ) : !details ? null : details.step === "CART" ? (
        <PhoneStep
          shop={shop}
          checkoutSessionId={details.checkoutSessionId}
          onCheckoutStarted={fetchDetails}
          setCanContinue={setCanContinue}
          registerContinue={setContinueHandler}
        />
      ) : (
        <StepRenderer
          details={details}
          refresh={fetchDetails}
          shop={shop}
          setCanContinue={setCanContinue}
          registerContinue={setContinueHandler}
        />
      )}
    </div>
  );

  return (
    <CheckoutContext.Provider value={{ details, refreshCheckout: fetchDetails, previousAddresses, setPreviousAddresses }}>

      <CheckoutShell
        footer={footerCTA}
        details={details}
        progress={<CheckoutProgress step={progressStep} />}
        showBack={showBack}
        onBack={handleBack}
        onClose={handleClose}
        left={
          <div className="p-4 md:p-6 space-y-4">
            {leftContent}
          </div>
        }
        right={rightContent}
      />

    </CheckoutContext.Provider>
  );
}