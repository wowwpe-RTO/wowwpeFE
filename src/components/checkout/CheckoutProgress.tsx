"use client";

type Props = {
  step: "summary" | "address" | "payment";
};

export default function CheckoutProgress({ step }: Props) {
  const active = "text-gray-900 font-bold text-sm";
  const inactive = "text-gray-400 text-sm font-normal";

  return (
    <>
      {/* MOBILE (< md): compact 2-step */}
      <div className="flex items-center gap-1.5 md:hidden">
        <span className={step === "summary" ? active : inactive}>
          Summary
        </span>
        <span className="text-gray-300 text-sm">»</span>
        <span className={step !== "summary" ? active : inactive}>
          {step === "payment" ? "Payments" : "Address & Payments"}
        </span>
      </div>

      {/* TABLET + DESKTOP (≥ md): full 3-step */}
      <div className="hidden md:flex items-center gap-2">
        <span className={step === "summary" ? active : inactive}>
          Summary
        </span>
        <span className="text-gray-300 text-sm">»</span>
        <span className={step === "address" ? active : inactive}>
          Address
        </span>
        <span className="text-gray-300 text-sm">»</span>
        <span className={step === "payment" ? active : inactive}>
          Payment
        </span>
      </div>
    </>
  );
}