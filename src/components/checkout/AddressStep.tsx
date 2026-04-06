"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { calculateShipping } from "@/lib/api/shipping";
import {
  MapPin, Home, Briefcase, MapPinned,
  Phone, MoreHorizontal, Plus, ChevronDown,
  Trash2, Check,
} from "lucide-react";
import { useCheckout, PreviousAddress } from "../contexts/CheckoutContext";

interface Props {
  sessionId: string;
  onSaved: () => void;
  setCanContinue: (v: boolean) => void;
  registerContinue: (fn: () => void) => void;
  previousAddresses?: PreviousAddress[];
}

interface Address {
  id: string;
  fullName: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  addressType: string;
}

const EMPTY_FORM = {
  fullName: "",
  line1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  email: "",
  phone: "",
  addressType: "HOME",
};

const INPUT_CLASS =
  "w-full h-11 px-3 rounded-xl border border-[#0B7E63]/40 focus:border-[#0B7E63] focus:ring-2 focus:ring-[#0B7E63]/15 outline-none text-sm bg-white transition";

const SELECT_CLASS =
  "w-full h-11 px-3 rounded-xl border border-[#0B7E63]/40 focus:border-[#0B7E63] focus:ring-2 focus:ring-[#0B7E63]/15 outline-none text-sm bg-white transition appearance-none";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

const countries = [
  { code: "IN", name: "India" }, { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" }, { code: "DE", name: "Germany" },
  { code: "FR", name: "France" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" }, { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" }, { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "CN", name: "China" },
];

export default function AddressStep({
  sessionId,
  onSaved,
  setCanContinue,
  registerContinue,
  previousAddresses: propAddresses = [],
}: Props) {

  // showForm: true = form view, false = confirm/list view
  const { details } = useCheckout();

  console.log("[AddressStep] propAddresses:", propAddresses?.length, propAddresses);

  // Extra addresses added by user during this session (beyond what came from context)
  const [extraAddresses, setExtraAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  // Form state
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // DERIVED: build full address list from context + extras
  // Memoized so the reference is stable and doesn't cause infinite effect loops
  const addresses = useMemo(() => {
    const contextMapped: Address[] = (propAddresses || []).map(
      (addr: PreviousAddress, i: number) => ({
        id: `ctx_${i}`,
        fullName: [addr.firstName || "", addr.lastName || ""]
          .filter(Boolean).join(" ").trim(),
        line1: addr.line1 || "",
        city: addr.city || "",
        state: addr.state || "",
        postalCode: addr.postalCode || "",
        country: addr.country || "IN",
        email: addr.email || "",
        phone: details?.phone || "",
        addressType: "HOME",
      })
    );
    return [...contextMapped, ...extraAddresses];
  }, [propAddresses, extraAddresses, details?.phone]);

  const isValid =
    form.fullName &&
    form.line1 &&
    form.city &&
    form.state &&
    form.postalCode &&
    form.phone;

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => { import("./PaymentStep"); }, []);

  /* Auto-select and show confirm when context addresses arrive */
  useEffect(() => {
    if (propAddresses && propAddresses.length > 0) {
      if (!selectedId) setSelectedId("ctx_0");
      setShowForm(false);
      setHydrating(false);
      return;
    }

    if (details?.shippingAddress) {
      const addr = details.shippingAddress;
      const fullName = [addr.firstName || "", addr.lastName || ""]
        .filter(Boolean).join(" ").trim();
      setExtraAddresses([{
        id: "saved",
        fullName,
        line1: addr.line1 || "",
        city: addr.city || "",
        state: addr.state || "",
        postalCode: addr.postalCode || "",
        country: addr.country || "IN",
        email: details.email || "",
        phone: details.phone || "",
        addressType: "HOME",
      }]);
      if (!selectedId) setSelectedId("saved");
      setShowForm(false);
      setHydrating(false);
      return;
    }

    if (details !== null) {
      // details loaded but no address — new user
      setShowForm(true);
      setHydrating(false);
    }
  }, [propAddresses, details]);

  /* PINCODE AUTOFILL */
  useEffect(() => {
    if (form.country !== "IN" || form.postalCode.length !== 6) return;

    async function fetchLocation() {
      try {
        const res = await fetch(
          `https://api.postalpincode.in/pincode/${form.postalCode}`
        );
        const data = await res.json();
        if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length) {
          const post = data[0].PostOffice[0];
          setForm((prev) => ({ ...prev, city: post.District, state: post.State }));
        }
      } catch {}
    }
    fetchLocation();
  }, [form.postalCode, form.country]);

  /* Footer button state */
  useEffect(() => {
    if (showForm) {
      setCanContinue(!!isValid);
    } else {
      setCanContinue(!!selectedId);
    }
  }, [showForm, isValid, selectedId, setCanContinue]);

  const handleSave = useCallback(async () => {

    /* ── FORM VIEW: validate then add to list ── */
    if (showForm) {
      if (!isValid) return;

      const newAddr: Address = {
        id: `addr_${Date.now()}`,
        ...form,
      };

      setExtraAddresses((prev) => [...prev, newAddr]);
      setSelectedId(newAddr.id);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      return;
    }

    /* ── CONFIRM VIEW: submit selected address to backend ── */
    const selected = addresses.find((a) => a.id === selectedId);
    if (!selected) return;

    try {
      setLoading(true);
      setError("");

      const nameParts = selected.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await api("/checkout/address", {
        method: "POST",
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          email: selected.email || undefined,
          phone: selected.phone,
          address: {
            firstName,
            lastName,
            line1: selected.line1,
            city: selected.city,
            state: selected.state,
            postalCode: selected.postalCode,
            country: selected.country,
          },
        }),
      });

      await calculateShipping(sessionId, selected.postalCode);
      await onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to continue");
    } finally {
      setLoading(false);
    }
  }, [showForm, isValid, form, addresses, selectedId, sessionId]);

  useEffect(() => {
    registerContinue(() => handleSave);
  }, [handleSave, registerContinue]);

  function deleteAddress(id: string) {
    // Context addresses can't be deleted — only user-added extras
    setExtraAddresses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (selectedId === id) {
        setSelectedId(addresses.find((a) => a.id !== id)?.id ?? null);
      }
      return next;
    });
  }

  if (hydrating) return null;

  /* ============================================================
     CONFIRM VIEW — list of saved addresses
  ============================================================ */
  if (!showForm) {
    return (
      <div className="flex flex-col">
        <div className="border border-[#ECECEC] shadow-[0_8px_24px_rgba(0,0,0,0.04)] rounded-3xl p-4">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900">Delivery Address</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setForm({ ...EMPTY_FORM }); // always blank
                  setShowForm(true);
                }}
                className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={12} />
                Add New Address
              </button>
              <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <ChevronDown size={14} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* ADDRESS CARDS */}
          <div className="space-y-3">
            {addresses.map((addr) => {
              const isSelected = addr.id === selectedId;
              const shippingLabel = addr.country === "IN" ? "Free" : "Calculated at next step";

              return (
                <div
                  key={addr.id}
                  onClick={() => setSelectedId(addr.id)}
                  className={`
                    rounded-2xl border-2 bg-white p-4 transition cursor-pointer
                    ${isSelected ? "border-[#0B7E63]" : "border-gray-200 hover:border-gray-300"}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#0B7E63] flex items-center justify-center shrink-0">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                      <span className="font-semibold text-sm text-gray-900">
                        {addr.fullName}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-[#0B7E63] rounded-full font-medium capitalize">
                        {addr.addressType.charAt(0) + addr.addressType.slice(1).toLowerCase()}
                      </span>
                    </div>

                    {/* Three-dot or trash — trash only when 2+ addresses */}
                    {addresses.length > 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAddress(addr.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-gray-700 transition">
                        <MoreHorizontal size={18} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-2 mb-1">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600 leading-snug">
                      {addr.line1}, {addr.city}, {addr.state}, {addr.postalCode}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-600">
                      {addr.phone}
                      {addr.email && (
                        <span className="text-gray-400"> - {addr.email}</span>
                      )}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Standard Shipping</span>
                    <span className="text-sm font-semibold text-gray-900">{shippingLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  /* ============================================================
     FORM VIEW — blank when opened via Add New Address
  ============================================================ */
  return (
    <div className="flex flex-col">
      <div className="rounded-2xl border border-[#ECECEC] shadow-sm p-5 bg-white">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">Delivery Address</h2>
          </div>
          {addresses.length > 0 && (
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Cancel
            </button>
          )}
        </div>

        {/* FULL NAME */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* PHONE */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center h-11 rounded-xl border border-[#0B7E63]/40 focus-within:border-[#0B7E63] focus-within:ring-2 focus-within:ring-[#0B7E63]/15 bg-white transition px-3">
            <span className="text-base leading-none">🇮🇳</span>
            <span className="ml-2 text-sm font-semibold text-gray-800">+91</span>
            <div className="mx-2 h-4 w-px bg-gray-300" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your phone number"
              className="flex-1 outline-none text-sm placeholder-gray-400 bg-transparent"
            />
          </div>
        </div>

        {/* EMAIL */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* PIN + COUNTRY */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={LABEL_CLASS}>
              Pin code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className={SELECT_CLASS}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ADDRESS LINE */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>
            House No. / Building No. / Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.line1}
            onChange={(e) => updateField("line1", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* CITY + STATE */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={LABEL_CLASS}>
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={INPUT_CLASS}
                placeholder="City"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>
              State <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className={INPUT_CLASS}
                placeholder="State"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ADDRESS TYPE */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>Address Type</label>
          <div className="flex gap-2">
            {[
              { key: "HOME", label: "Home", icon: Home },
              { key: "WORK", label: "Work", icon: Briefcase },
              { key: "OTHER", label: "Other", icon: MapPinned },
            ].map((type) => {
              const Icon = type.icon;
              const active = form.addressType === type.key;
              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => updateField("addressType", type.key)}
                  className={`
                    flex-1 h-10 rounded-xl border flex items-center justify-center gap-1.5 text-sm font-medium transition
                    ${active
                      ? "border-[#0B7E63] text-[#0B7E63] bg-green-50"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon size={14} />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        {/* TERMS */}
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          This address will be secured with OTP on Wowwpe checkouts. View{" "}
          <a href="#" className="underline">Terms and conditions</a> and{" "}
          <a href="#" className="underline">Privacy Policy</a>
        </p>

      </div>
    </div>
  );
}