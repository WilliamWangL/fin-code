/**
 * Minimal typings and a cached loader for the PayPal JS SDK (FIN-019). The
 * SDK is fetched from PayPal's CDN on first use; the client id passed to the
 * SDK is public by design. Sandbox client ids must load the SDK from the
 * sandbox host: loaded from the live host the approval flow talks to live
 * services, where the sandbox subscription does not exist (cartid 406) and
 * the approval window never opens. A failed load never poisons the cache:
 * the next attempt recreates the script tag.
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

/** One cached loader promise per CDN host, client id and locale. */
const sdkPromises = new Map<string, Promise<PayPalSdk>>();

/**
 * PayPal locale codes for the site locales. Without the locale parameter the
 * SDK follows the browser language instead (Chinese buttons on the /en site).
 */
const SDK_LOCALES: Record<string, string> = { en: "en_US", zh: "zh_CN" };

export function loadPayPalSdk(clientId: string, sandbox = false, locale = "en"): Promise<PayPalSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PAYPAL_SDK_SERVER"));
  }
  if (window.paypal) {
    return Promise.resolve(window.paypal);
  }
  // The script host decides which environment the SDK talks to; a sandbox
  // client id on the live host cannot approve its subscriptions.
  const host = sandbox ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
  const resolvedLocale = SDK_LOCALES[locale] ?? "en_US";
  const cacheKey = `${host}|${clientId}|${resolvedLocale}`;
  let sdkPromise = sdkPromises.get(cacheKey);
  if (!sdkPromise) {
    sdkPromise = new Promise<PayPalSdk>((resolve, reject) => {
      const params = new URLSearchParams({
        "client-id": clientId,
        currency: "USD",
        intent: "subscription",
        vault: "true",
        components: "buttons",
        locale: resolvedLocale,
      });
      const script = document.createElement("script");
      script.src = `${host}/sdk/js?${params.toString()}`;
      script.async = true;
      script.onload = () => {
        if (window.paypal) {
          resolve(window.paypal);
        } else {
          sdkPromises.delete(cacheKey);
          reject(new Error("PAYPAL_SDK_MISSING"));
        }
      };
      script.onerror = () => {
        sdkPromises.delete(cacheKey);
        reject(new Error("PAYPAL_SDK_LOAD_FAILED"));
      };
      document.head.appendChild(script);
    });
    sdkPromises.set(cacheKey, sdkPromise);
  }
  return sdkPromise;
}
