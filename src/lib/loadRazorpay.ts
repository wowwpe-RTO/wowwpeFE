export function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("razorpay-sdk")) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject();

    document.body.appendChild(script);
  });
}