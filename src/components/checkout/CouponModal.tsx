"use client";

import { useEffect, useState } from "react";
import { X, Percent } from "lucide-react";
import { api } from "@/lib/api";

interface Coupon {
  code: string;
  type: "FLAT" | "PERCENT";
  value: number;
  min_order_amount: number;
}

function formatCoupon(coupon: Coupon) {
  const discount =
    coupon.type === "FLAT"
      ? `₹${coupon.value} OFF`
      : `${coupon.value}% OFF`;

  const min =
    coupon.min_order_amount > 0
      ? `on orders above ₹${coupon.min_order_amount}`
      : "on all orders";

  return {
    title: discount,
    subtitle: min,
  };
}

export default function CouponModal({
  checkoutSessionId,
}: {
  checkoutSessionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener("open-coupon-modal", handleOpen);

    return () => {
      window.removeEventListener("open-coupon-modal", handleOpen);
    };
  }, []);

  

  

  useEffect(() => {
    if (!open) return;

    async function load() {
      try {
        setLoading(true);
        const res = await api<{ coupons: Coupon[] }>("/checkout/coupons");
        const data = Array.isArray(res) ? res : res.coupons;

setCoupons(data || []);

        console.log("COUPONS RESPONSE:", res);
        
      } catch (err) {
        console.error("Coupon fetch failed", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open]);



  async function applyCoupon(code: string) {
    if (!checkoutSessionId) return;

    try {
      setApplying(code);

      const res = await api("/checkout/coupon/apply", {
        method: "POST",
        body: JSON.stringify({
          checkoutSessionId,
          code,
        }),
      });

      window.dispatchEvent(
        new CustomEvent("coupon-applied", {
          detail: res,
        })
      );

      setOpen(false);
    } catch (err) {
      console.error("Coupon apply failed", err);
    } finally {
      setApplying(null);
    }
  }

  
  

  if (!open) return null;

  

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[400px] relative">

        {/* CLOSE */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-4">
          <Percent size={16} />
          <h2 className="font-semibold">Coupons</h2>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">Loading coupons...</p>
        )}

        {!loading && coupons.length === 0 && (
  <p className="text-sm text-gray-500">
    No coupons available (check backend)
  </p>
)}

        <div className="space-y-3">
          {coupons.map((coupon) => {
            const formatted = formatCoupon(coupon);

            return (
              <div
                key={coupon.code}
                className="border rounded-xl p-4 flex justify-between items-center hover:border-black transition"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {formatted.title}
                  </p>

                  <p className="text-xs text-gray-500">
                    {formatted.subtitle}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Code: {coupon.code}
                  </p>
                </div>

                <button
                  onClick={() => applyCoupon(coupon.code)}
                  disabled={applying === coupon.code}
                  className="text-sm font-semibold text-[#0B7E63]"
                >
                  {applying === coupon.code ? "Applying..." : "Apply"}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}