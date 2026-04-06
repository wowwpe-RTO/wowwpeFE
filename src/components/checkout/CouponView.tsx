"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCheckout } from "../contexts/CheckoutContext";

interface Coupon {
  code: string;
  type: "FLAT" | "PERCENT";
  value: number;
  min_order_amount: number;
  max_discount?: number;
}

/* Tag icon matching screenshot */
function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.828 8.828a2 2 0 0 0 2.828 0l6.172-6.172a2 2 0 0 0 0-2.828L12.586 2.586z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function computeDiscount(coupon: Coupon, subtotal: number): number {
  let discount = 0;
  if (coupon.type === "FLAT") {
    discount = coupon.value;
  } else {
    discount = Math.floor(subtotal * (coupon.value / 100));
  }
  if (coupon.max_discount) {
    discount = Math.min(discount, coupon.max_discount);
  }
  return discount;
}

function getTitle(coupon: Coupon): string {
  return coupon.type === "FLAT"
    ? `Flat ₹${coupon.value} off`
    : `Flat ${coupon.value}% off`;
}

export default function CouponView({
  checkoutSessionId,
  onBack,
}: {
  checkoutSessionId?: string;
  onBack: () => void;
}) {
  const { details } = useCheckout();
  const subtotalPaise = details?.totals?.subtotalPaise ?? 0;
  const totalPaise = details?.totals?.totalPaise ?? 0;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    try {
      setLoading(true);
      const res = await api<{ coupons: Coupon[] }>("/checkout/coupons");
      setCoupons(res.coupons || []);
    } catch (err) {
      console.error("Coupon fetch failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function applyCoupon(code: string) {
    if (!checkoutSessionId) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    try {
      setApplying(normalized);
      setManualError("");

      const res = await api("/checkout/coupon/apply", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId, code: normalized }),
      });

      window.dispatchEvent(new CustomEvent("coupon-applied", { detail: res }));
      onBack();
    } catch (err: any) {
      if (normalized === manualCode.trim().toUpperCase()) {
        setManualError(err.message || "Invalid coupon code");
      }
    } finally {
      setApplying(null);
    }
  }

  // Split into eligible and ineligible
  const eligible = coupons.filter(
    (c) => subtotalPaise >= c.min_order_amount
  );
  const ineligible = coupons.filter(
    (c) => subtotalPaise < c.min_order_amount
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-gray-700 hover:text-black transition p-1 -ml-1"
          >
            <ChevronUp size={20} className="-rotate-90" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Coupons for you</h2>
        </div>

        {/* Current total */}
        <span className="text-lg font-bold text-gray-900">
          ₹{(totalPaise / 100).toFixed(0)}
        </span>
      </div>

      <div className="px-5 pb-5 space-y-4">

        {/* MANUAL INPUT — tag icon inside, full width */}
        <div className={`flex items-center gap-2 border rounded-2xl px-4 py-3 bg-white transition ${
          manualError ? "border-red-400" : "border-gray-200"
        }`}>
          <TagIcon className="text-gray-400 shrink-0" />
          <input
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setManualError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCoupon(manualCode);
            }}
            placeholder="Enter coupon code"
            className="flex-1 outline-none text-sm placeholder-gray-400 bg-transparent"
          />
          {manualCode.trim() && (
            <button
              onClick={() => applyCoupon(manualCode)}
              disabled={!!applying}
              className="text-[#0B7E63] text-sm font-bold disabled:opacity-50"
            >
              {applying === manualCode.trim().toUpperCase() ? "..." : "APPLY"}
            </button>
          )}
        </div>

        {manualError && (
          <p className="text-red-500 text-xs -mt-2">{manualError}</p>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[0, 1].map((i) => (
              <div key={i} className="border border-gray-100 rounded-2xl p-4 space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* ELIGIBLE COUPONS */}
        {!loading && eligible.map((coupon) => {
          const discount = computeDiscount(coupon, subtotalPaise);
          const isExpanded = expanded === coupon.code;
          const isApplying = applying === coupon.code;

          return (
            <div
              key={coupon.code}
              className="border border-gray-200 rounded-2xl overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">

                  {/* LEFT: icon + text */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <TagIcon className="text-[#0B7E63]" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {getTitle(coupon)}
                      </p>
                      <p className="text-sm text-[#0B7E63] font-medium mt-0.5">
                        Save ₹{(discount / 100).toFixed(0)} on this order
                      </p>
                    </div>
                  </div>

                  {/* APPLY PILL */}
                  <button
                    onClick={() => applyCoupon(coupon.code)}
                    disabled={isApplying}
                    className="shrink-0 px-4 py-1.5 bg-green-50 text-[#0B7E63] text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 transition disabled:opacity-50"
                  >
                    {isApplying ? "..." : "APPLY"}
                  </button>
                </div>

                {/* TAGS + VIEW DETAILS */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs border border-gray-300 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {coupon.code}
                  </span>

                  <button
                    onClick={() =>
                      setExpanded(isExpanded ? null : coupon.code)
                    }
                    className="flex items-center gap-1 text-xs text-gray-600 font-medium"
                  >
                    View Details
                    {isExpanded
                      ? <ChevronUp size={13} />
                      : <ChevronDown size={13} />
                    }
                  </button>
                </div>
              </div>

              {/* EXPANDABLE DETAILS */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="bg-gray-50 px-4 py-3 space-y-1.5 text-xs text-gray-600">
                  {coupon.type === "PERCENT" && (
                    <p>• Flat {coupon.value}% off on the total order value</p>
                  )}
                  {coupon.type === "FLAT" && (
                    <p>• Flat ₹{coupon.value} off on the total order value</p>
                  )}
                  {coupon.min_order_amount > 0 && (
                    <p>• Applicable on orders above ₹{(coupon.min_order_amount / 100).toFixed(0)}</p>
                  )}
                  {coupon.max_discount && (
                    <p>• Maximum discount ₹{(coupon.max_discount / 100).toFixed(0)}</p>
                  )}
                  <p>• Applicable once per user</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* OTHER COUPONS DIVIDER */}
        {!loading && ineligible.length > 0 && (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">
                Other Coupons
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {ineligible.map((coupon) => (
              <div
                key={coupon.code}
                className="border border-gray-200 rounded-2xl p-4 opacity-80"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <TagIcon className="text-gray-400" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {getTitle(coupon)}
                    </p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      This coupon is not applicable
                    </p>
                    <span className="inline-block mt-2 text-xs border border-gray-300 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {coupon.code}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && coupons.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No coupons available
          </p>
        )}

      </div>
    </div>
  );
}