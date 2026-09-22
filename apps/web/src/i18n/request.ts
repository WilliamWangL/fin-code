import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // 显式固定时区，避免服务端预渲染时 use-intl 报 ENVIRONMENT_FALLBACK
    // 并保证静态生成的日期格式确定性（门户用量页均使用 UTC 日期语义）
    timeZone: "UTC",
  };
});
