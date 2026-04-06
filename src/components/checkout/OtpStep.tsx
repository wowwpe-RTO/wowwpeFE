"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { CheckoutDetails } from "@/lib/types";
import { Pencil } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCheckout } from "../contexts/CheckoutContext";

interface Props {
  details: CheckoutDetails;
  refresh: () => Promise<void>;
}

export default function OtpStep({ details, refresh }: Props) {
  const { setPreviousAddresses } = useCheckout();
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const phone = typeof details.phone === "string" ? details.phone : "";
  const formattedPhone = phone && phone.length >= 10 ? `+91 ${phone}` : "";

  useEffect(() => {
    import("./AddressStep");
  }, []);

  /* TIMER */
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  /* INPUT HANDLING */
  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== "")) verifyOtp(newOtp.join(""));
  }

  function handleBackspace(index: number) {
    if (otp[index] === "" && index > 0) inputs.current[index - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("Text").trim();
    if (!/^\d{4}$/.test(pasted)) return;
    setOtp(pasted.split(""));
    verifyOtp(pasted);
  }

  /* VERIFY */
  async function verifyOtp(code: string) {
    try {
      setLoading(true);
      setError("");

      const res: any = await api("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          checkoutSessionId: details.checkoutSessionId,
          otp: code,
        }),
      });

      // Store all previous addresses in context so AddressStep
      // can show them instantly without an extra API call
      if (res?.previousAddresses?.length) {
        setPreviousAddresses(res.previousAddresses);
      }

      await refresh();
    } catch {
      setError("Invalid OTP");
      setOtp(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (timer > 0) return;
    try {
      await api("/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId: details.checkoutSessionId }),
      });
      setTimer(30);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleEditPhone() {
    try {
      await api("/auth/otp/edit", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId: details.checkoutSessionId }),
      });
      await refresh();
    } catch {
      console.error("Failed to return to phone step");
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* OTP CARD — matches screenshot: white card, no heavy shadow */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] px-6 py-8 text-center">

        <p className="text-base font-medium text-gray-700">
          Enter 4 digit code sent on
        </p>

        {/* Phone number + edit pencil */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[#0B7E63] font-semibold text-base">
            {formattedPhone}
          </span>
          <button onClick={handleEditPhone} className="text-gray-500 hover:text-gray-800 transition">
            <Pencil size={14} />
          </button>
        </div>

        {/* OTP BOXES — large square style from screenshot */}
        <div
          className={`flex justify-center gap-3 mt-6 ${error ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
          onPaste={handlePaste}
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => e.key === "Backspace" && handleBackspace(i)}
              className={`
                w-14 h-14
                text-2xl font-semibold text-center
                rounded-xl border-2
                transition-all duration-200
                outline-none
                ${error
                  ? "border-red-400 bg-red-50"
                  : digit
                  ? "border-[#0B7E63] bg-white"
                  : "border-gray-200 bg-white focus:border-[#0B7E63]"
                }
              `}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-3">{error}</p>
        )}

        {loading && (
          <p className="text-gray-400 text-sm mt-3">Verifying...</p>
        )}

        {/* RESEND — circular icon buttons matching screenshot */}
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">Resend OTP via</p>

          <div className="flex justify-center gap-10">

            {/* WhatsApp */}
            <button
              onClick={resendOtp}
              disabled={timer > 0}
              className="flex flex-col items-center gap-1.5 disabled:opacity-40 transition"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FaWhatsapp size={22} className="text-green-500" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Whatsapp</span>
            </button>

            {/* Message */}
            <button
              onClick={resendOtp}
              disabled={timer > 0}
              className="flex flex-col items-center gap-1.5 disabled:opacity-40 transition"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                {/* Blue message bubble */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    fill="#3B82F6" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-medium">Message</span>
            </button>

          </div>

          {timer > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              You can resend in {timer}s
            </p>
          )}
        </div>

      </div>

      {/* TRUST ICONS — same circular style as PhoneStep */}
      <div className="grid grid-cols-3 text-gray-500 text-xs mt-8 text-center gap-2">

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span>Secured Payments</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <span>Cash on Delivery</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <span>Fast Shipping</span>
        </div>

      </div>

    </div>
  );
}