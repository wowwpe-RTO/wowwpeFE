export function openRazorpay(options: any) {
  if (typeof window === "undefined") return;

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}