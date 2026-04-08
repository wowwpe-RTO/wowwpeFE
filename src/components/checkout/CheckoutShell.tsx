"use client";

import { ReactNode, useEffect } from "react";
import { CheckoutDetails } from "@/lib/types";
import { X, ChevronLeft } from "lucide-react";

export default function CheckoutShell({
  left,
  right,
  footer,
  details,
  progress,
  onBack,
  showBack,
  onClose,
}: {
  left: ReactNode;
  right: ReactNode;
  footer?: ReactNode;
  details?: CheckoutDetails | null;
  progress?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  onClose?: () => void;
}) {
  const logoUrl = details?.branding?.logoUrl;
  const storeName = details?.branding?.storeName || "Store";

  useEffect(() => {
    if (!details?.branding) return;
    const root = document.documentElement;
    if (details.branding.primaryColor) {
      root.style.setProperty("--wowwpe-primary", details.branding.primaryColor);
    }
    if (details.branding.accentColor) {
      root.style.setProperty("--wowwpe-accent", details.branding.accentColor);
    }
  }, [details]);

  return (
    <>
      {/* =============================================
          MOBILE LAYOUT — < 768px
          Full screen, single column
      ============================================= */}
      <div className="md:hidden flex flex-col min-h-screen bg-white">

        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                onClick={onBack}
                className="text-gray-700 hover:text-black transition p-1 -ml-1"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {logoUrl ? (
              <>
                <img src={logoUrl} alt={storeName} className="h-7 w-auto object-contain max-w-[120px]" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                <span className="text-xl font-bold text-gray-900 tracking-tight hidden">{storeName}</span>
              </>
            ) : (
              <span className="text-xl font-bold text-gray-900 tracking-tight">{storeName}</span>
            )}
          </div>
          <div className="flex items-center">{progress}</div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto pb-28">
          <div className="px-4 pt-4 space-y-3">{left}</div>
          <div className="px-4 pt-3">{right}</div>
        </div>

        {/* STICKY FOOTER */}
        {footer && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.06)]">
            {footer}
          </div>
        )}
      </div>

      {/* =============================================
          TABLET + DESKTOP LAYOUT — ≥ 768px
          Centered modal, fluid on tablet, fixed on large desktop
      ============================================= */}
      <div className="hidden md:flex fixed inset-0 items-center justify-center pointer-events-none">

        <div className="
    relative backdrop-blur-md rounded-2xl flex overflow-hidden
    pointer-events-auto
    w-full
    md:max-w-[95vw] md:max-h-[95vh]
    lg:max-w-[960px] lg:h-[70vh]
  ">

          {/* ── TABLET: single column stacked layout ── */}
          <div className="flex flex-col w-full lg:hidden overflow-y-auto">

            {/* Header */}
            <div className="relative flex items-center px-6 pt-4 pb-3 shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {showBack && (
                  <button onClick={onBack} className="text-gray-700 hover:text-black transition p-1 -ml-1">
                    <ChevronLeft size={20} />
                  </button>
                )}
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt={storeName} className="h-7 w-auto object-contain max-w-[120px]" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                    <span className="text-xl font-bold text-gray-900 tracking-tight hidden">{storeName}</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-gray-900 tracking-tight">{storeName}</span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                {progress}
                <button onClick={onClose} className="text-gray-400 hover:text-black transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Summary section */}
            <div className="px-6 py-4">
              {left}
            </div>

            {/* Step content */}
            <div className="flex-1 px-6 pt-4 pb-4">
              {right}
            </div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-end shadow-[0_-4px_10px_rgba(0,0,0,0.04)]">
                {footer}
              </div>
            )}
          </div>

          {/* ── DESKTOP: two-column side-by-side layout ── */}
          <div className="hidden lg:flex w-full">

            {/* LEFT */}
            <div className="w-1/2 bg-white/60 backdrop-blur-sm overflow-y-auto">
              {left}
            </div>

            {/* RIGHT */}
            <div className="w-1/2 flex flex-col bg-white">

              {/* Logo + X */}
              <div className="relative flex items-center px-8 pt-4 pb-3 shrink-0">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain max-w-[140px]" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                    <span className="text-2xl font-bold text-gray-900 tracking-tight hidden">{storeName}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">{storeName}</span>
                )}
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-black transition">
                  <X size={22} />
                </button>
              </div>

              {/* Progress */}
              {progress && (
                <div className="flex justify-end px-8 pb-3 shrink-0 border-b border-gray-100">
                  {progress}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 pt-4">
                {right}
              </div>

              {/* Footer */}
              {footer && (
                <div className="shrink-0 bg-white border-t border-gray-100 px-8 py-3 flex justify-end shadow-[0_-4px_10px_rgba(0,0,0,0.04)]">
                  {footer}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}