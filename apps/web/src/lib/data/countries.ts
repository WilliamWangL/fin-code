import type { Country } from "./types";

/**
 * Country reference data (ISO 3166-1 + ISO 4217 + IBAN registry).
 * The preview dataset covers the V1 target markets plus major IBAN countries.
 */
export const countries: Country[] = [
  // ── Europe ────────────────────────────────────────────────────────────────
  { iso2: "AT", iso3: "AUT", numeric: "040", nameEn: "Austria", nameLocal: "奥地利", currency: "EUR", iban: { supported: true, length: 20 } },
  { iso2: "BE", iso3: "BEL", numeric: "056", nameEn: "Belgium", nameLocal: "比利时", currency: "EUR", iban: { supported: true, length: 16 } },
  { iso2: "BG", iso3: "BGR", numeric: "100", nameEn: "Bulgaria", nameLocal: "保加利亚", currency: "BGN", iban: { supported: true, length: 22 } },
  { iso2: "CH", iso3: "CHE", numeric: "756", nameEn: "Switzerland", nameLocal: "瑞士", currency: "CHF", iban: { supported: true, length: 21 } },
  { iso2: "CY", iso3: "CYP", numeric: "196", nameEn: "Cyprus", nameLocal: "塞浦路斯", currency: "EUR", iban: { supported: true, length: 28 } },
  { iso2: "CZ", iso3: "CZE", numeric: "203", nameEn: "Czechia", nameLocal: "捷克", currency: "CZK", iban: { supported: true, length: 24 } },
  { iso2: "DE", iso3: "DEU", numeric: "276", nameEn: "Germany", nameLocal: "德国", currency: "EUR", iban: { supported: true, length: 22 } },
  { iso2: "DK", iso3: "DNK", numeric: "208", nameEn: "Denmark", nameLocal: "丹麦", currency: "DKK", iban: { supported: true, length: 18 } },
  { iso2: "EE", iso3: "EST", numeric: "233", nameEn: "Estonia", nameLocal: "爱沙尼亚", currency: "EUR", iban: { supported: true, length: 20 } },
  { iso2: "ES", iso3: "ESP", numeric: "724", nameEn: "Spain", nameLocal: "西班牙", currency: "EUR", iban: { supported: true, length: 24 } },
  { iso2: "FI", iso3: "FIN", numeric: "246", nameEn: "Finland", nameLocal: "芬兰", currency: "EUR", iban: { supported: true, length: 18 } },
  { iso2: "FR", iso3: "FRA", numeric: "250", nameEn: "France", nameLocal: "法国", currency: "EUR", iban: { supported: true, length: 27 } },
  { iso2: "GB", iso3: "GBR", numeric: "826", nameEn: "United Kingdom", nameLocal: "英国", currency: "GBP", iban: { supported: true, length: 22 }, localIdentifierType: "SORT_CODE" },
  { iso2: "GR", iso3: "GRC", numeric: "300", nameEn: "Greece", nameLocal: "希腊", currency: "EUR", iban: { supported: true, length: 27 } },
  { iso2: "HR", iso3: "HRV", numeric: "191", nameEn: "Croatia", nameLocal: "克罗地亚", currency: "EUR", iban: { supported: true, length: 21 } },
  { iso2: "HU", iso3: "HUN", numeric: "348", nameEn: "Hungary", nameLocal: "匈牙利", currency: "HUF", iban: { supported: true, length: 28 } },
  { iso2: "IE", iso3: "IRL", numeric: "372", nameEn: "Ireland", nameLocal: "爱尔兰", currency: "EUR", iban: { supported: true, length: 22 } },
  { iso2: "IT", iso3: "ITA", numeric: "380", nameEn: "Italy", nameLocal: "意大利", currency: "EUR", iban: { supported: true, length: 27 } },
  { iso2: "LT", iso3: "LTU", numeric: "440", nameEn: "Lithuania", nameLocal: "立陶宛", currency: "EUR", iban: { supported: true, length: 20 } },
  { iso2: "LU", iso3: "LUX", numeric: "442", nameEn: "Luxembourg", nameLocal: "卢森堡", currency: "EUR", iban: { supported: true, length: 20 } },
  { iso2: "LV", iso3: "LVA", numeric: "428", nameEn: "Latvia", nameLocal: "拉脱维亚", currency: "EUR", iban: { supported: true, length: 21 } },
  { iso2: "MT", iso3: "MLT", numeric: "470", nameEn: "Malta", nameLocal: "马耳他", currency: "EUR", iban: { supported: true, length: 31 } },
  { iso2: "NL", iso3: "NLD", numeric: "528", nameEn: "Netherlands", nameLocal: "荷兰", currency: "EUR", iban: { supported: true, length: 18 } },
  { iso2: "NO", iso3: "NOR", numeric: "578", nameEn: "Norway", nameLocal: "挪威", currency: "NOK", iban: { supported: true, length: 15 } },
  { iso2: "PL", iso3: "POL", numeric: "616", nameEn: "Poland", nameLocal: "波兰", currency: "PLN", iban: { supported: true, length: 28 } },
  { iso2: "PT", iso3: "PRT", numeric: "620", nameEn: "Portugal", nameLocal: "葡萄牙", currency: "EUR", iban: { supported: true, length: 25 } },
  { iso2: "RO", iso3: "ROU", numeric: "642", nameEn: "Romania", nameLocal: "罗马尼亚", currency: "RON", iban: { supported: true, length: 24 } },
  { iso2: "SE", iso3: "SWE", numeric: "752", nameEn: "Sweden", nameLocal: "瑞典", currency: "SEK", iban: { supported: true, length: 24 } },
  { iso2: "SI", iso3: "SVN", numeric: "705", nameEn: "Slovenia", nameLocal: "斯洛文尼亚", currency: "EUR", iban: { supported: true, length: 19 } },
  { iso2: "SK", iso3: "SVK", numeric: "703", nameEn: "Slovakia", nameLocal: "斯洛伐克", currency: "EUR", iban: { supported: true, length: 24 } },
  { iso2: "TR", iso3: "TUR", numeric: "792", nameEn: "Türkiye", nameLocal: "土耳其", currency: "TRY", iban: { supported: true, length: 26 } },
  { iso2: "UA", iso3: "UKR", numeric: "804", nameEn: "Ukraine", nameLocal: "乌克兰", currency: "UAH", iban: { supported: true, length: 29 } },

  // ── Americas ──────────────────────────────────────────────────────────────
  { iso2: "US", iso3: "USA", numeric: "840", nameEn: "United States", nameLocal: "美国", currency: "USD", iban: { supported: false }, localIdentifierType: "ABA_ROUTING" },
  { iso2: "CA", iso3: "CAN", numeric: "124", nameEn: "Canada", nameLocal: "加拿大", currency: "CAD", iban: { supported: false }, localIdentifierType: "TRANSIT_NUMBER" },
  { iso2: "BR", iso3: "BRA", numeric: "076", nameEn: "Brazil", nameLocal: "巴西", currency: "BRL", iban: { supported: true, length: 29 } },
  { iso2: "MX", iso3: "MEX", numeric: "484", nameEn: "Mexico", nameLocal: "墨西哥", currency: "MXN", iban: { supported: false } },
  { iso2: "CR", iso3: "CRI", numeric: "188", nameEn: "Costa Rica", nameLocal: "哥斯达黎加", currency: "CRC", iban: { supported: true, length: 22 } },

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  { iso2: "AU", iso3: "AUS", numeric: "036", nameEn: "Australia", nameLocal: "澳大利亚", currency: "AUD", iban: { supported: false }, localIdentifierType: "BSB" },
  { iso2: "CN", iso3: "CHN", numeric: "156", nameEn: "China", nameLocal: "中国", currency: "CNY", iban: { supported: false }, localIdentifierType: "CNAPS" },
  { iso2: "HK", iso3: "HKG", numeric: "344", nameEn: "Hong Kong SAR", nameLocal: "中国香港", currency: "HKD", iban: { supported: false }, localIdentifierType: "CLEARING_CODE" },
  { iso2: "IN", iso3: "IND", numeric: "356", nameEn: "India", nameLocal: "印度", currency: "INR", iban: { supported: false }, localIdentifierType: "IFSC" },
  { iso2: "JP", iso3: "JPN", numeric: "392", nameEn: "Japan", nameLocal: "日本", currency: "JPY", iban: { supported: false } },
  { iso2: "KR", iso3: "KOR", numeric: "410", nameEn: "South Korea", nameLocal: "韩国", currency: "KRW", iban: { supported: false } },
  { iso2: "SG", iso3: "SGP", numeric: "702", nameEn: "Singapore", nameLocal: "新加坡", currency: "SGD", iban: { supported: false }, localIdentifierType: "BANK_CODE" },
  { iso2: "NZ", iso3: "NZL", numeric: "554", nameEn: "New Zealand", nameLocal: "新西兰", currency: "NZD", iban: { supported: false } },

  // ── Middle East & Africa ──────────────────────────────────────────────────
  { iso2: "AE", iso3: "ARE", numeric: "784", nameEn: "United Arab Emirates", nameLocal: "阿联酋", currency: "AED", iban: { supported: true, length: 23 } },
  { iso2: "SA", iso3: "SAU", numeric: "682", nameEn: "Saudi Arabia", nameLocal: "沙特阿拉伯", currency: "SAR", iban: { supported: true, length: 24 } },
  { iso2: "QA", iso3: "QAT", numeric: "634", nameEn: "Qatar", nameLocal: "卡塔尔", currency: "QAR", iban: { supported: true, length: 29 } },
  { iso2: "KW", iso3: "KWT", numeric: "414", nameEn: "Kuwait", nameLocal: "科威特", currency: "KWD", iban: { supported: true, length: 30 } },
  { iso2: "BH", iso3: "BHR", numeric: "048", nameEn: "Bahrain", nameLocal: "巴林", currency: "BHD", iban: { supported: true, length: 22 } },
  { iso2: "OM", iso3: "OMN", numeric: "512", nameEn: "Oman", nameLocal: "阿曼", currency: "OMR", iban: { supported: true, length: 23 } },
  { iso2: "IL", iso3: "ISR", numeric: "376", nameEn: "Israel", nameLocal: "以色列", currency: "ILS", iban: { supported: true, length: 23 } },
  { iso2: "ZA", iso3: "ZAF", numeric: "710", nameEn: "South Africa", nameLocal: "南非", currency: "ZAR", iban: { supported: false } },

  // ── South Asia ────────────────────────────────────────────────────────────
  { iso2: "PK", iso3: "PAK", numeric: "586", nameEn: "Pakistan", nameLocal: "巴基斯坦", currency: "PKR", iban: { supported: true, length: 24 } },
  { iso2: "BD", iso3: "BGD", numeric: "050", nameEn: "Bangladesh", nameLocal: "孟加拉国", currency: "BDT", iban: { supported: true, length: 28 } },
  { iso2: "LK", iso3: "LKA", numeric: "144", nameEn: "Sri Lanka", nameLocal: "斯里兰卡", currency: "LKR", iban: { supported: true, length: 28 } },
];

export const countryByIso2: Record<string, Country> = Object.fromEntries(
  countries.map((country) => [country.iso2, country]),
);
