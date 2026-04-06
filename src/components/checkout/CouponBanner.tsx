"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

type Props = {
  onClick?: () => void;
  checkoutSessionId?: string;
};

export default function CouponBanner({ onClick, checkoutSessionId }: Props) {
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    function handleApplied(e: any) {
      setAppliedCode(e.detail?.couponCode ?? null);
    }

    function handleRemoved() {
      setAppliedCode(null);
    }

    window.addEventListener("coupon-applied", handleApplied);
    window.addEventListener("coupon-removed", handleRemoved);

    return () => {
      window.removeEventListener("coupon-applied", handleApplied);
      window.removeEventListener("coupon-removed", handleRemoved);
    };
  }, []);

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!checkoutSessionId || removing) return;

    try {
      setRemoving(true);
      const res = await api("/checkout/coupon/remove", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId }),
      });
      window.dispatchEvent(new CustomEvent("coupon-removed", { detail: res }));
    } catch (err) {
      console.error("Coupon remove failed", err);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      onClick={appliedCode ? undefined : onClick}
      className={`
        rounded-2xl
        border border-[#C8E6C9]
        bg-[#F1F8F1]
        px-4 py-3.5
        transition-all duration-200
        ${!appliedCode
          ? "cursor-pointer hover:bg-[#E8F5E9] active:scale-[0.99] group"
          : "cursor-default"
        }
      `}
    >
      <div className="flex items-center justify-between">

        {/* LEFT — icon + text */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Dark green rounded square icon */}
          <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.828 8.828a2 2 0 0 0 2.828 0l6.172-6.172a2 2 0 0 0 0-2.828L12.586 2.586z"
                fill="white"
                fillOpacity="0.15"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
              <line x1="9" y1="15" x2="15" y2="9" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="14.5" cy="14.5" r="1" fill="white" />
            </svg>
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1B5E20] truncate">
              {appliedCode ?? "Savings Corner"}
            </p>
            {/* View all coupons always visible, clickable even when coupon applied */}
            <p
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="text-xs text-gray-500 mt-0.5 cursor-pointer hover:underline"
            >
              View all coupons &rsaquo;
            </p>
          </div>

        </div>

        {/* RIGHT — Remove when applied, Apply when not */}
        {appliedCode ? (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 transition disabled:opacity-50 shrink-0 ml-3"
          >
            <X size={12} />
            {removing ? "Removing..." : "Remove"}
          </button>
        ) : (
          <span className="text-sm font-semibold text-[#2E7D32] group-hover:underline shrink-0 ml-3">
            Apply
          </span>
        )}

      </div>
    </div>
  );
}