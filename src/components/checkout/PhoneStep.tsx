"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Props {
  shop: string;
  checkoutSessionId: string;
  onCheckoutStarted: (sessionId: string) => void;
  setCanContinue: (v: boolean) => void;
  registerContinue: (fn: () => void) => void;
}

export default function PhoneStep({
  shop,
  checkoutSessionId,
  onCheckoutStarted,
  setCanContinue,
  registerContinue,
}: Props) {
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHydrating(false), 400);
    return () => clearTimeout(t);
  }, []);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  const handleContinue = useCallback(async () => {
    if (!isValidPhone) return;

    try {
      setLoading(true);
      setError("");

      await api("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId, phone, shop }),
      });

      onCheckoutStarted(checkoutSessionId);
    } catch (err: any) {
      setError(err.message || "Invalid input");
    } finally {
      setLoading(false);
    }
  }, [phone, isValidPhone, checkoutSessionId]);

  useEffect(() => {
    setCanContinue(isValidPhone);
  }, [isValidPhone, setCanContinue]);

  useEffect(() => {
    registerContinue(() => handleContinue);
  }, [handleContinue, registerContinue]);

  /* SKELETON */
  if (hydrating) {
    return (
      <div className="flex flex-col animate-pulse">

        {/* Card skeleton */}
        <div className="border border-[#ECECEC] rounded-3xl p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
          </div>

          {/* Phone input */}
          <div className="h-12 bg-gray-200 rounded-xl" />

          {/* Checkbox row */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-200 rounded" />
          </div>

        </div>

        {/* Trust icons skeleton */}
        <div className="grid grid-cols-3 gap-2 mt-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col">

      {/* CARD */}
      <div className="border border-[#ECECEC] shadow-[0_8px_24px_rgba(0,0,0,0.04)] rounded-3xl p-6">

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-800">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.81.32 1.6.59 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.72-1.16a2 2 0 0 1 2.11-.45c.76.27 1.55.47 2.36.59A2 2 0 0 1 22 16.92z"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
        </div>

        {/* PHONE INPUT */}
        <div className="flex items-center h-12 px-4 rounded-xl border border-[#0B7E63] focus-within:ring-2 focus-within:ring-[#0B7E63]/20 transition bg-white">
          <span className="text-lg leading-none">🇮🇳</span>
          <span className="ml-2 text-sm font-semibold text-gray-900">+91</span>
          <div className="mx-3 h-5 w-px bg-gray-300" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter your phone number"
            className="flex-1 outline-none text-sm placeholder-gray-400 bg-transparent"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {/* OPT IN */}
        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="accent-[#0B7E63] w-4 h-4"
          />
          <span className="text-gray-600 text-sm">
            Notify me about offers &amp; updates
          </span>
        </label>

      </div>

      {/* TRUST ICONS */}
      <div className="grid grid-cols-3 text-gray-500 text-xs mt-10 text-center gap-2">

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