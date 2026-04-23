"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Plus, Minus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CheckoutDetails } from "@/lib/types";
import { useCheckout } from "../contexts/CheckoutContext";

type PreviewItem = {
  variant_id: number;
  product_title: string;
  variant_title?: string | null;
  image: string | null;
  unit_price_paise: number;
  compare_at_price_paise?: number | null;
  quantity: number;
};

type PreviewResponse = {
  items: PreviewItem[];
  subtotalPaise: number;
  discountPaise?: number;
  shippingPaise: number;
  shippingCalculated?: boolean;
  totalPaise: number;
};

type Props = {
  checkoutSessionId: string | null;
  details?: CheckoutDetails;
  mode?: "preview" | "final";
};

export default function OrderSummary({
  checkoutSessionId,
  details,
  mode = "preview",
}: Props) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // MRP discount — from compare_at_price differences
  const [mrpDiscountPaise, setMrpDiscountPaise] = useState(0);

  // Coupon discount — only from coupon events, never overwritten by MRP logic
  const [couponDiscountPaise, setCouponDiscountPaise] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    details?.couponCode ?? null
  );
  const [couponLabel, setCouponLabel] = useState<string | null>(null);

  const { refreshCheckout } = useCheckout();

  

  /* ================================
     FETCH PREVIEW (ONCE)
  ================================= */

const fetchedRef = useRef<string | null>(null);

useEffect(() => {
  if (!checkoutSessionId || checkoutSessionId === "undefined") return;

  if (fetchedRef.current === checkoutSessionId) return;

  fetchedRef.current = checkoutSessionId;

  let cancelled = false;

  const fetchPreview = async () => {
    try {
      const data = await api<PreviewResponse>("/checkout/preview", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId }),
      });

      if (cancelled) return;

      if (!data.items?.length) {
        console.warn("[OrderSummary] Empty preview — skipping");
        fetchedRef.current = null; // allow retry
        return;
      }

      setPreview(data);
    } catch (err) {
      if (cancelled) return;
      fetchedRef.current = null; // allow retry on error
      console.error("[OrderSummary] Preview fetch failed:", err);
    }
  };

  fetchPreview();

  return () => {
    cancelled = true;
  };
}, [checkoutSessionId]);

  /* ================================
     COUPON EVENTS
  ================================= */

  useEffect(() => {
    function handleCouponApplied(e: any) {
      const { discountPaise, totalPaise, couponCode, couponType, couponValue } = e.detail;
      setCouponDiscountPaise(discountPaise ?? 0);
      setAppliedCouponCode(couponCode ?? null);
      if (couponType === "PERCENT") {
        setCouponLabel(`${couponValue}% OFF`);
      } else if (couponType === "FLAT") {
        setCouponLabel(`₹${couponValue} OFF`);
      } else {
        setCouponLabel(null);
      }
      setPreview((prev) => prev ? { ...prev, totalPaise } : prev);
    }

    function handleCouponRemoved(e: any) {
      const { totalPaise } = e.detail;
      setCouponDiscountPaise(0);
      setAppliedCouponCode(null);
      setCouponLabel(null);
      setPreview((prev) => prev ? { ...prev, totalPaise } : prev);
    }

    window.addEventListener("coupon-applied", handleCouponApplied);
    window.addEventListener("coupon-removed", handleCouponRemoved);

    return () => {
      window.removeEventListener("coupon-applied", handleCouponApplied);
      window.removeEventListener("coupon-removed", handleCouponRemoved);
    };
  }, []);

  /* ================================
     QUANTITY UPDATE
  ================================= */

  async function updateQuantity(variantId: number, newQty: number) {
    if (!checkoutSessionId || !preview || newQty < 0 || updatingId) return;

    setError(null);
    const previous = preview;
    const previousMrp = mrpDiscountPaise;

    const updatedItems =
      newQty === 0
        ? preview.items.filter((i) => i.variant_id !== variantId)
        : preview.items.map((i) =>
            i.variant_id === variantId ? { ...i, quantity: newQty } : i
          );

    const newSubtotal = updatedItems.reduce(
      (sum, i) => sum + i.unit_price_paise * i.quantity, 0
    );
    const newCompareTotal = updatedItems.reduce(
      (sum, i) =>
        sum + ((i.compare_at_price_paise || i.unit_price_paise) * i.quantity),
      0
    );
    const newMrpDiscount =
      newCompareTotal > newSubtotal ? newCompareTotal - newSubtotal : 0;

    const shipping = newSubtotal >= 300000 ? 0 : preview.shippingPaise || 0;
    const newTotal = Math.max(newSubtotal + shipping - couponDiscountPaise, 0);

    setMrpDiscountPaise(newMrpDiscount);
    setPreview({ ...preview, items: updatedItems, subtotalPaise: newSubtotal, totalPaise: newTotal });
    setUpdatingId(variantId);

    try {
      await api("/checkout/cart/update", {
        method: "POST",
        body: JSON.stringify({
          checkoutSessionId,
          variantId: Number(variantId),
          quantity: Number(newQty),
        }),
      });
      await refreshCheckout();
      if (newQty === 0) {
        window.dispatchEvent(
          new CustomEvent("cart-remove-optimistic", { detail: { variantId } })
        );
      }
    } catch (err: any) {
      setPreview(previous);
      setMrpDiscountPaise(previousMrp);
      setError(err.message || "Stock unavailable");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(variantId: number) {
    if (!checkoutSessionId || !preview || updatingId) return;

    setUpdatingId(variantId);
    const previous = preview;
    const previousMrp = mrpDiscountPaise;

    const updatedItems = preview.items.filter((i) => i.variant_id !== variantId);
    const newSubtotal = updatedItems.reduce(
      (sum, i) => sum + i.unit_price_paise * i.quantity, 0
    );
    const newCompareTotal = updatedItems.reduce(
      (sum, i) =>
        sum + ((i.compare_at_price_paise || i.unit_price_paise) * i.quantity),
      0
    );
    const newMrpDiscount =
      newCompareTotal > newSubtotal ? newCompareTotal - newSubtotal : 0;

    const shipping = newSubtotal >= 300000 ? 0 : preview.shippingPaise || 0;
    const newTotal = Math.max(newSubtotal + shipping - couponDiscountPaise, 0);

    setMrpDiscountPaise(newMrpDiscount);
    setPreview({ ...preview, items: updatedItems, subtotalPaise: newSubtotal, totalPaise: newTotal });

    try {
      await api("/checkout/cart/update", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId, variantId: Number(variantId), quantity: 0 }),
      });
      await refreshCheckout();
      window.dispatchEvent(new CustomEvent("cart-remove-optimistic", { detail: { variantId } }));
    } catch {
      setPreview(previous);
      setMrpDiscountPaise(previousMrp);
    } finally {
      setUpdatingId(null);
    }
  }

  /* ======================================================
     FINAL MODE
  ====================================================== */

  if (mode === "final" && details) {
    const totals = details.totals;

    return (
      <div className="bg-white rounded-3xl border border-[#ECECEC] shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h2>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-gray-900">₹{(totals.subtotalPaise / 100).toFixed(0)}</span>
          </div>

          {totals.discountPaise > 0 && (
            <div className="flex justify-between">
              <span>Discount on MRP</span>
              <span className="text-[#0B7E63]">-₹{(totals.discountPaise / 100).toFixed(0)}</span>
            </div>
          )}

          {totals.couponCode && (
            <div className="flex justify-between">
              <span>Coupon Discount</span>
              <span className="text-[#0B7E63] font-medium">Applied</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="text-gray-900">₹{(totals.shippingPaise / 100).toFixed(0)}</span>
          </div>

          {totals.taxPaise > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="text-gray-900">₹{(totals.taxPaise / 100).toFixed(0)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold text-base text-gray-900">
          <span>Grand Total</span>
          <span>₹{(totals.totalPaise / 100).toFixed(0)}</span>
        </div>
      </div>
    );
  }

  /* ================================
     LOADING / EMPTY
  ================================= */

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-4 animate-pulse space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-16 bg-gray-200 rounded-2xl" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!preview || !preview.items.length) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-4">
        <p className="text-gray-500 text-sm">No items in cart.</p>
      </div>
    );
  }

  /* ================================
     PREVIEW MODE
  ================================= */

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

      {/* HEADER — cart icon + title left, item count + total (mobile) + chevron right */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* LEFT: cart icon in gray bg square + title */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-700" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h2l2.2 9.2a1 1 0 0 0 .98.8h7.4a1 1 0 0 0 .96-.74L20 8H7" />
              <circle cx="10" cy="19" r="1.6" />
              <circle cx="17" cy="19" r="1.6" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
        </div>

        {/* RIGHT: item count + grand total on mobile + bare chevron */}
        <div className="flex items-center gap-1.5">
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {preview.items.length} item{preview.items.length !== 1 ? "s" : ""}
            </p>
            {/* Grand total visible on mobile only when collapsed */}
            {collapsed && (
              <p className="text-sm font-bold text-gray-900 md:hidden">
                ₹{(preview.totalPaise / 100).toFixed(0)}
              </p>
            )}
          </div>
          {collapsed
            ? <ChevronDown size={16} className="text-gray-500" />
            : <ChevronUp size={16} className="text-gray-500" />
          }
        </div>
      </div>

      {error && (
        <div className="px-5 pb-2 text-xs text-red-500">{error}</div>
      )}

      <div
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${collapsed ? "max-h-0 opacity-0" : "max-h-[1500px] opacity-100"}
        `}
      >
        <div className="px-5 pb-5">

          {/* ITEM LIST */}
          <div className="space-y-4 mb-5">
            {preview.items.map((item) => {
              const itemTotal = (item.unit_price_paise * item.quantity) / 100;
              const hasCompare =
                item.compare_at_price_paise &&
                item.compare_at_price_paise > item.unit_price_paise;

              const productName = item.product_title || item.variant_title || "Product";
              const variantLabel = item.product_title && item.variant_title
                ? `( ${item.variant_title} )`
                : null;

              return (
                <div
                  key={item.variant_id}
                  className="relative flex items-start gap-3"
                >
                  {updatingId === item.variant_id && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
                      <div className="w-5 h-5 border-2 border-[#0B7E63] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* IMAGE — larger matching screenshot */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.product_title}
                      loading="lazy"
                      className="w-[72px] h-[72px] rounded-xl object-cover bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">
                      IMG
                    </div>
                  )}

                  {/* DETAILS */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      {/* Title: bold product name + lighter variant inline */}
                      <p className="text-sm text-gray-900 leading-snug">
                        <span className="font-semibold">{productName}</span>
                        {variantLabel && (
                          <span className="font-normal text-gray-500"> {variantLabel}</span>
                        )}
                      </p>

                      {/* PRICE + STRIKETHROUGH */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">
                          ₹{itemTotal.toFixed(0)}
                        </p>
                        {hasCompare && (
                          <p className="text-xs text-gray-400 line-through">
                            ₹{((item.compare_at_price_paise! * item.quantity) / 100).toFixed(0)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* QTY CONTROLS — hidden when order is completed */}
                    {mode !== "final" && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {item.quantity === 1 ? (
                        <button
                          onClick={() => updateQuantity(item.variant_id, 0)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-red-50 transition"
                        >
                          <Trash2 size={11} className="text-gray-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
                        >
                          <Minus size={11} className="text-gray-600" />
                        </button>
                      )}

                      <span className="w-4 text-center text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
                      >
                        <Plus size={11} className="text-gray-600" />
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PRICE BREAKDOWN */}
          <div className="border-t border-gray-200 pt-4 space-y-2.5 text-sm">

            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="text-gray-900 font-medium">
                ₹{(preview.subtotalPaise / 100).toFixed(0)}
              </span>
            </div>

            {mrpDiscountPaise > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount on MRP</span>
                <span className="text-[#0B7E63] font-medium">
                  -₹{(mrpDiscountPaise / 100).toFixed(0)}
                </span>
              </div>
            )}

            {/* Coupon discount — amount on same line, directly under MRP discount */}
            {appliedCouponCode && couponDiscountPaise > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Coupon Discount</span>
                <span className="text-[#0B7E63] font-medium">
                  -₹{(couponDiscountPaise / 100).toFixed(0)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="text-gray-900 font-medium">
                {preview.shippingCalculated
                  ? `₹${(preview.shippingPaise / 100).toFixed(0)}`
                  : "Calculated at next step"}
              </span>
            </div>

          </div>

          {/* GRAND TOTAL */}
          <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
            <span className="text-base font-bold text-gray-900">Grand Total</span>
            <span className="text-base font-bold text-gray-900">
              ₹{(preview.totalPaise / 100).toFixed(0)}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}