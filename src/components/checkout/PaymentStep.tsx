"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { initPayment } from "@/lib/api/payment";
import { openRazorpay } from "@/lib/payments/openRazorpay";
import { CheckoutDetails } from "@/lib/types";
import { loadRazorpay } from "@/lib/loadRazorpay";
import { useCheckout } from "../contexts/CheckoutContext";
import { X } from "lucide-react";

declare global {
  interface Window { Razorpay: any; }
}

interface Props {
  sessionId: string;
  details: CheckoutDetails;
  refresh: () => Promise<void>;
}

/* ── Custom method icons matching screenshot ── */

function UpiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" fill="currentColor" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1 0-4h14v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <line x1="7" y1="15" x2="12" y2="15" />
    </svg>
  );
}

function EmiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <path d="M7 15h2v2H7zM12 15h2v2h-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Confetti pieces for success modal ── */
const CONFETTI = [
  { x: "8%",  y: "12%", w: 10, h: 14, color: "#f87171", rotate: 20,  delay: 0,    duration: 1.8, round: false },
  { x: "18%", y: "6%",  w: 8,  h: 12, color: "#86efac", rotate: -30, delay: 0.2,  duration: 2.1, round: false },
  { x: "30%", y: "18%", w: 6,  h: 6,  color: "#fde68a", rotate: 45,  delay: 0.1,  duration: 1.6, round: true  },
  { x: "55%", y: "8%",  w: 10, h: 14, color: "#93c5fd", rotate: -15, delay: 0.3,  duration: 2.0, round: false },
  { x: "68%", y: "15%", w: 8,  h: 10, color: "#f9a8d4", rotate: 60,  delay: 0,    duration: 1.9, round: false },
  { x: "78%", y: "5%",  w: 6,  h: 6,  color: "#86efac", rotate: -45, delay: 0.15, duration: 1.7, round: true  },
  { x: "88%", y: "20%", w: 10, h: 12, color: "#fde68a", rotate: 10,  delay: 0.25, duration: 2.2, round: false },
  { x: "12%", y: "40%", w: 6,  h: 8,  color: "#93c5fd", rotate: -20, delay: 0.35, duration: 1.5, round: false },
  { x: "82%", y: "38%", w: 8,  h: 10, color: "#f87171", rotate: 35,  delay: 0.1,  duration: 2.0, round: false },
  { x: "45%", y: "4%",  w: 8,  h: 6,  color: "#c4b5fd", rotate: -10, delay: 0.4,  duration: 1.8, round: false },
];

export default function PaymentStep({ sessionId, details, refresh }: Props) {
  const { details: liveDetails } = useCheckout();
  const checkoutDetails = liveDetails ?? details;

  const isCompleted = checkoutDetails.step === "COMPLETED";
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const paymentAttempted = useRef(false);

  const totalPaise = checkoutDetails.totals.totalPaise;

  const { totalDisplay, partialDisplay, partialRemainingDisplay } = useMemo(() => {
    const totalDisplay = (totalPaise / 100).toFixed(0);
    const partialPaise = Math.floor(totalPaise * 0.5);
    const partialDisplay = (partialPaise / 100).toFixed(0);
    const partialRemainingDisplay = ((totalPaise - partialPaise) / 100).toFixed(0);
    return { totalDisplay, partialDisplay, partialRemainingDisplay };
  }, [totalPaise]);

  useEffect(() => { loadRazorpay(); }, []);

  const methods = [
    {
      key: "UPI",
      title: "UPI",
      subtitle: "Pay through UPI",
      icon: UpiIcon,
      amount: `₹${totalDisplay}`,
      badge: "Extra 1% off",
    },
    {
      key: "CARD",
      title: "Debit/Credit Cards",
      subtitle: "Pay via RuPay, Visa, Master Card",
      icon: CardIcon,
      amount: `₹${totalDisplay}`,
      badge: "Extra 1% off",
    },
    {
      key: "WALLET",
      title: "Wallets",
      subtitle: "PhonePe, Airtel, PayPal & more",
      icon: WalletIcon,
      amount: `₹${totalDisplay}`,
      badge: "Extra 1% off",
    },
    {
      key: "PARTIAL",
      title: "Partial Payment",
      subtitle: `Pay ₹${partialRemainingDisplay} on Delivery`,
      icon: PartialIcon,
      amount: `₹${partialDisplay}`,
      badge: null,
    },
    {
      key: "EMI",
      title: "EMI",
      subtitle: "Pay via Credit/ Debit Card EMI",
      icon: EmiIcon,
      amount: `₹${totalDisplay}`,
      badge: "Extra 1% off",
    },
  ];

  async function handlePay(method: string) {
    try {
      setLoading(true);
      await loadRazorpay();

      const res: any = await initPayment({
        checkoutSessionId: sessionId,
        gateway: "razorpay",
        paymentMethod: method,
      });

      const options = {
        key: res.key,
        amount: res.amountPaise,
        currency: res.currency,
        order_id: res.gatewayOrderId,
        name: checkoutDetails.branding?.storeName || "Checkout",
        description: method === "PARTIAL" ? "Partial Payment" : "Secure Payment",
        prefill: {
          contact: details.phone,
          email: checkoutDetails.email,
        },
        theme: {
          color: checkoutDetails.branding?.primaryColor || "#0B7E63",
        },
        handler: async function () {
          paymentAttempted.current = false;
          setShowSuccess(true);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            if (paymentAttempted.current) {
              setShowFailure(true);
            }
            paymentAttempted.current = false;
          },
        },
      };

      paymentAttempted.current = true;
      openRazorpay(options);
    } catch (err) {
      console.error("Payment failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">

        {/* METHOD LIST */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
          {methods.map((method, idx) => {
            const Icon = method.icon;
            const isLast = idx === methods.length - 1;

            return (
              <div
                key={method.key}
                onClick={() => !loading && !isCompleted && handlePay(method.key)}
                className={`
                  flex items-center justify-between px-4 py-4
                  ${!isLast ? "border-b border-gray-100" : ""}
                  ${isCompleted ? "opacity-40 cursor-not-allowed" : loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}
                  transition
                `}
              >
                {/* LEFT: icon + text */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 shrink-0">
                    <Icon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{method.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{method.subtitle}</p>
                  </div>
                </div>

                {/* RIGHT: amount + badge */}
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-[#0B7E63]">{method.amount}</p>
                  {method.badge && (
                    <p className="text-xs text-[#0B7E63] mt-0.5">{method.badge}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* LOGGED IN ROW */}
        <div className="flex items-center justify-between mt-5 px-1">
          <p className="text-xs text-gray-500">
            Logged in with +91 {details.phone}
          </p>
          {!isCompleted && (
            <button
              onClick={async () => {
                try {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/otp/edit`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ checkoutSessionId: sessionId }),
                    }
                  );
                  await refresh();
                } catch (err) {
                  console.error("Logout failed", err);
                }
              }}
              className="text-xs font-bold text-gray-900 hover:underline"
            >
              Log Out
            </button>
          )}
        </div>

      </div>

      {/* ── SUCCESS MODAL ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <button
              onClick={async () => {
                setShowSuccess(false);
                await refresh();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition z-10"
            >
              <X size={22} />
            </button>

            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {CONFETTI.map((c, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce"
                  style={{
                    left: c.x,
                    top: c.y,
                    width: c.w,
                    height: c.h,
                    backgroundColor: c.color,
                    borderRadius: c.round ? "50%" : "2px",
                    transform: `rotate(${c.rotate}deg)`,
                    animationDelay: `${c.delay}s`,
                    animationDuration: `${c.duration}s`,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>

            <div className="relative flex flex-col items-center text-center px-6 pt-10 pb-8">
              {/* Green pulsing check */}
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-full bg-[#0B7E63] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12.5l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 12.5l4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">Wooww! Order Confirmed</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                That was a seamless checkout<br />
                Your order is now being prepared with care.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── FAILURE MODAL ── */}
      {showFailure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <button
              onClick={() => setShowFailure(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition z-10"
            >
              <X size={22} />
            </button>

            <div className="flex flex-col items-center text-center px-6 pt-10 pb-8">
              {/* Red alert bubble */}
              <div className="mb-5">
                <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
                  <rect x="4" y="4" width="56" height="52" rx="12" fill="#EF4444" />
                  <text x="32" y="40" textAnchor="middle" fill="white" fontSize="30" fontWeight="bold" fontFamily="sans-serif">!</text>
                  <polygon points="20,54 44,54 32,70" fill="#EF4444" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">Uh-oh! Payment failed</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Your payment didn't go through,<br />
                but you're just one step away
              </p>

              <button
                onClick={() => setShowFailure(false)}
                className="w-full h-14 rounded-2xl bg-[#0B7E63] text-white font-semibold text-base hover:bg-green-700 transition"
              >
                Retry Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}