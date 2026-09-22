/**
 * Minimal typings and a cached loader for the PayPal JS SDK (FIN-019). The
 * SDK is fetched from PayPal's CDN on first use; the client id passed to the
 * SDK is public by design. A failed load never poisons the cache: the next
 * attempt recreates the script tag.
 */

export interface PayPalSubscriptionApprovalData {
  subscriptionID?: string;
  orderID?: string;
}

export interface PayPalButtonsOptions {
  style?: Record<string, string | number>;
  createSubscription: () => Promise<string>;
  onApprove: (data: PayPalSubscriptionApprovalData) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}

export interface PayPalButtonsInstance {
  render(target: HTMLElement): Promise<void>;
  close?(): void;
}

interface PayPalSdk {
  Buttons(options: PayPalButtonsOptions): PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

let sdkPromise: Promise<PayPalSdk> | null = null;

export function loadPayPalSdk(clientId: string): Promise<PayPalSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PAYPAL_SDK_SERVER"));
  }
  if (window.paypal) {
    return Promise.resolve(window.paypal);
  }
  if (!sdkPromise) {
    sdkPromise = new Promise<PayPalSdk>((resolve, reject) => {
      const params = new URLSearchParams({
        "client-id": clientId,
        currency: "USD",
        intent: "subscription",
        vault: "true",
        components: "buttons",
      });
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      script.onload = () => {
        if (window.paypal) {
          resolve(window.paypal);
        } else {
          sdkPromise = null;
          reject(new Error("PAYPAL_SDK_MISSING"));
        }
      };
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error("PAYPAL_SDK_LOAD_FAILED"));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}
