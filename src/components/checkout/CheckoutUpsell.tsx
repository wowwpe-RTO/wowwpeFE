"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useCheckout } from "../contexts/CheckoutContext";

type UpsellProduct = {
  id: number;
  title: string;
  brand: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  variantId: number;
  variantTitle?: string | null;
};

export default function CheckoutUpsell({
  shop,
  checkoutSessionId,
  refresh,
  locked = false,
}: {
  shop: string;
  checkoutSessionId?: string;
  refresh?: () => Promise<void>;
  locked?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartVariantIds, setCartVariantIds] = useState<number[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* LOAD PRODUCTS */
  useEffect(() => {
    async function load() {
      try {
        const res = await api<{ products: UpsellProduct[] }>(`/checkout/upsell?shop=${shop}`);
        setProducts(res.products);
      } catch (err) {
        console.error("Upsell load failed", err);
      } finally {
        setLoading(false);
      }
    }
    if (shop) load();
  }, [shop]);

  /* TRACK SCROLL POSITION */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function check() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    const t = setTimeout(check, 50);
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [products, collapsed]);

  /* LOAD CART */
  // useEffect(() => {
  //   async function loadCartItems() {
  //     if (!checkoutSessionId) return;
  //     try {
  //       const res = await api<{ items: { variant_id: number }[] }>(
  //         "/checkout/preview",
  //         { method: "POST", body: JSON.stringify({ checkoutSessionId }) }
  //       );
  //       setCartVariantIds(res.items.map((i) => i.variant_id));
  //     } catch {}
  //   }

  //   loadCartItems();

  //   function handleRemove(e: any) {
  //     const { variantId } = e.detail;
  //     setCartVariantIds((prev) => prev.filter((id) => id !== variantId));
  //   }

  //   window.addEventListener("cart-remove-optimistic", handleRemove);
  //   return () => window.removeEventListener("cart-remove-optimistic", handleRemove);
  // }, [checkoutSessionId]);

  /* SCROLL */
  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const cardW = scrollRef.current.offsetWidth / 2 + 6;
    scrollRef.current.scrollBy({ left: dir === "right" ? cardW : -cardW, behavior: "smooth" });
  }

  /* ADD */
  async function handleAdd(variantId: number) {
    if (!checkoutSessionId || loadingIds.includes(variantId)) return;
    setLoadingIds((prev) => [...prev, variantId]);
    const product = products.find((p) => p.variantId === variantId);

    try {
      await api("/checkout/cart/update", {
        method: "POST",
        body: JSON.stringify({ checkoutSessionId, variantId, quantity: 1 }),
      });

      if (product) {
        window.dispatchEvent(new CustomEvent("cart-add-optimistic", {
          detail: {
            variant_id: product.variantId,
            product_title: product.title,
            variant_title: null,
            image: product.image,
            unit_price_paise: product.price * 100,
            compare_at_price_paise: product.compareAtPrice ? product.compareAtPrice * 100 : null,
            quantity: 1,
          },
        }));
      }

      setCartVariantIds((prev) => prev.includes(variantId) ? prev : [...prev, variantId]);
    } catch (err) {
      console.error("Add failed", err);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== variantId));
    }
  }

  /* SKELETON */
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-lg" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-4 bg-gray-200 rounded" />
        </div>
        <div className="px-4 pb-4 flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="w-14 h-8 bg-gray-200 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

      {/* HEADER */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">You may also like</h3>
        </div>
        <div className="w-7 h-7 flex items-center justify-center">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* COLLAPSE WRAPPER */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? "max-h-0 opacity-0" : "max-h-[400px] opacity-100"}`}>

        {/* SCROLL AREA with floating chevrons */}
        <div className="relative px-4 pb-4">

          {/* LEFT CHEVRON */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-4 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition"
            >
              <ChevronLeft size={15} className="text-gray-600" />
            </button>
          )}

          {/* RIGHT CHEVRON */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-4 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition"
            >
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          )}

          {/* SCROLLABLE ROW */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((product) => {
              const isAdded = cartVariantIds.includes(product.variantId);
              const isLoading = loadingIds.includes(product.variantId);
              const savingsPct =
                product.compareAtPrice && product.compareAtPrice > product.price
                  ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                  : null;

              return (
                <div
                  key={product.id}
                  className="border border-gray-100 rounded-2xl p-3 bg-white flex items-center gap-3 shrink-0"
                  style={{ width: "calc(68% - 6px)", minWidth: "calc(68% - 6px)" }}
                >
                  {/* THUMBNAIL — fixed size, never shrinks */}
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-14 h-14 object-cover rounded-xl bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-xl shrink-0" />
                  )}

                  {/* INFO — flex-1 with overflow hidden so long titles never push the button */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-900 truncate leading-snug">
                      {product.title}
                    </p>
                    {product.variantTitle && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        ({product.variantTitle})
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs font-bold text-gray-900">₹{product.price}</span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-[10px] text-gray-400 line-through">₹{product.compareAtPrice}</span>
                      )}
                    </div>
                    {savingsPct && (
                      <p className="text-[10px] font-semibold text-[#0B7E63] mt-0.5">{savingsPct}%</p>
                    )}
                  </div>

                  {/* ADD BUTTON — fixed width so it never gets squeezed or overlaps */}
                  <button
                    disabled={isAdded || isLoading || locked}
                    onClick={() => !locked && handleAdd(product.variantId)}
                    className={`
                      shrink-0 w-14 h-9 rounded-xl border-2
                      flex items-center justify-center
                      text-sm font-semibold
                      transition-all duration-200
                      ${locked
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : isLoading
                        ? "border-[#0B7E63] text-[#0B7E63] opacity-60 cursor-not-allowed"
                        : isAdded
                        ? "border-gray-200 text-gray-400 cursor-default"
                        : "border-[#0B7E63] text-[#0B7E63] hover:bg-green-50 active:scale-95"
                      }
                    `}
                  >
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#0B7E63] border-t-transparent rounded-full animate-spin" />
                    ) : isAdded ? (
                      <Check size={13} />
                    ) : (
                      "Add"
                    )}
                  </button>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}