"use client";

import { X } from "lucide-react";

type Props = {
  shopLogo?: string;
};

export default function CheckoutHeader({ shopLogo }: Props) {
  return (
    <div className="flex items-center justify-between">

      {/* LOGO */}
      {shopLogo ? (
        <img
          src={shopLogo}
          alt="Store Logo"
          className="h-8 object-contain"
        />
      ) : (
        <div className="text-lg font-bold">
          Store
        </div>
      )}

      {/* CLOSE */}
      <button className="text-gray-600 hover:text-gray-900">
        <X size={22} />
      </button>

    </div>
  );
}