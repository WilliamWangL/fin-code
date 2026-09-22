import type { Institution } from "./types";

/**
 * Preview institution dataset.
 *
 * Only widely published, verifiable identifiers are included. Every record
 * carries a `sourceId` referencing `sources.ts`, and head-office branch
 * information is limited to publicly known facts. The production dataset is
 * imported by the data pipeline (FIN-020+), never hand-authored.
 */
export const institutions: Institution[] = [
  // ── United States ─────────────────────────────────────────────────────────
  {
    slug: "jpmorgan-chase-bank",
    legalName: "JPMorgan Chase Bank, National Association",
    nameEn: "JPMorgan Chase Bank",
    shortName: "JPMorgan Chase",
    country: "US",
    institutionType: "BANK",
    website: "https://www.chase.com",
    identifiers: [
      { type: "SWIFT", value: "CHASUS33", city: "New York", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "ABA_ROUTING", value: "021000021", city: "New York", label: "Wire routing", sourceId: "src-aba-registrar", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "New York", address: "383 Madison Avenue, New York, NY" },
    ],
  },
  {
    slug: "bank-of-america",
    legalName: "Bank of America, National Association",
    nameEn: "Bank of America",
    shortName: "Bank of America",
    country: "US",
    institutionType: "BANK",
    website: "https://www.bankofamerica.com",
    identifiers: [
      { type: "SWIFT", value: "BOFAUS3N", city: "New York", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "ABA_ROUTING", value: "026009593", city: "New York", label: "Wire routing", sourceId: "src-aba-registrar", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Charlotte", address: "100 North Tryon Street, Charlotte, NC" },
    ],
  },
  {
    slug: "citibank",
    legalName: "Citibank, National Association",
    nameEn: "Citibank",
    shortName: "Citibank",
    country: "US",
    institutionType: "BANK",
    website: "https://www.citi.com",
    identifiers: [
      { type: "SWIFT", value: "CITIUS33", city: "New York", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "ABA_ROUTING", value: "021000089", city: "New York", label: "Wire routing", sourceId: "src-aba-registrar", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "New York", address: "388 Greenwich Street, New York, NY" },
    ],
  },
  {
    slug: "wells-fargo-bank",
    legalName: "Wells Fargo Bank, National Association",
    nameEn: "Wells Fargo Bank",
    shortName: "Wells Fargo",
    country: "US",
    institutionType: "BANK",
    website: "https://www.wellsfargo.com",
    identifiers: [
      { type: "SWIFT", value: "WFBIUS6S", city: "San Francisco", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "ABA_ROUTING", value: "121000248", city: "San Francisco", label: "Wire routing", sourceId: "src-aba-registrar", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "San Francisco", address: "420 Montgomery Street, San Francisco, CA" },
    ],
  },

  // ── United Kingdom ────────────────────────────────────────────────────────
  {
    slug: "barclays",
    legalName: "Barclays Bank PLC",
    nameEn: "Barclays Bank",
    shortName: "Barclays",
    country: "GB",
    institutionType: "BANK",
    website: "https://home.barclays",
    identifiers: [
      { type: "SWIFT", value: "BARCGB22", city: "London", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "SORT_CODE", value: "200000", label: "London", sourceId: "src-pay-uk", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "London", address: "1 Churchill Place, London" },
    ],
  },
  {
    slug: "hsbc-uk",
    legalName: "HSBC UK Bank plc",
    nameEn: "HSBC UK Bank",
    shortName: "HSBC UK",
    country: "GB",
    institutionType: "BANK",
    website: "https://www.hsbc.co.uk",
    identifiers: [
      { type: "SWIFT", value: "HSBCGB2L", city: "Birmingham", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "SORT_CODE", value: "400515", label: "HSBC Bank plc", sourceId: "src-pay-uk", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Birmingham", address: "1 Centenary Square, Birmingham" },
    ],
  },
  {
    slug: "lloyds-bank",
    legalName: "Lloyds Bank plc",
    nameEn: "Lloyds Bank",
    shortName: "Lloyds Bank",
    country: "GB",
    institutionType: "BANK",
    website: "https://www.lloydsbank.com",
    identifiers: [
      { type: "SWIFT", value: "LOYDGB2L", city: "London", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "SORT_CODE", value: "300000", label: "Lloyds Bank plc", sourceId: "src-pay-uk", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "London", address: "25 Gresham Street, London" },
    ],
  },

  // ── Germany ───────────────────────────────────────────────────────────────
  {
    slug: "deutsche-bank",
    legalName: "Deutsche Bank Aktiengesellschaft",
    nameEn: "Deutsche Bank",
    shortName: "Deutsche Bank",
    country: "DE",
    institutionType: "BANK",
    website: "https://www.db.com",
    identifiers: [
      { type: "SWIFT", value: "DEUTDEFF", city: "Frankfurt am Main", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Frankfurt am Main", address: "Taunusanlage 12, 60325 Frankfurt am Main" },
    ],
  },
  {
    slug: "commerzbank",
    legalName: "Commerzbank Aktiengesellschaft",
    nameEn: "Commerzbank",
    shortName: "Commerzbank",
    country: "DE",
    institutionType: "BANK",
    website: "https://www.commerzbank.com",
    identifiers: [
      { type: "SWIFT", value: "COBADEFF", city: "Frankfurt am Main", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Frankfurt am Main", address: "Kaiserplatz 1, 60311 Frankfurt am Main" },
    ],
  },

  // ── France ────────────────────────────────────────────────────────────────
  {
    slug: "bnp-paribas",
    legalName: "BNP Paribas S.A.",
    nameEn: "BNP Paribas",
    shortName: "BNP Paribas",
    country: "FR",
    institutionType: "BANK",
    website: "https://www.bnpparibas.com",
    identifiers: [
      { type: "SWIFT", value: "BNPAFRPP", city: "Paris", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Paris", address: "16 Boulevard des Italiens, 75009 Paris" },
    ],
  },
  {
    slug: "societe-generale",
    legalName: "Société Générale S.A.",
    nameEn: "Société Générale",
    shortName: "Société Générale",
    country: "FR",
    institutionType: "BANK",
    website: "https://www.societegenerale.com",
    identifiers: [
      { type: "SWIFT", value: "SOGEFRPP", city: "Paris", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Paris", address: "29 Boulevard Haussmann, 75009 Paris" },
    ],
  },

  // ── China ─────────────────────────────────────────────────────────────────
  {
    slug: "icbc",
    legalName: "Industrial and Commercial Bank of China Limited",
    nameEn: "Industrial and Commercial Bank of China",
    nameLocal: "中国工商银行股份有限公司",
    shortName: "ICBC",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.icbc.com.cn",
    identifiers: [
      { type: "SWIFT", value: "ICBKCNBJ", city: "Beijing", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "CNAPS", value: "102100099996", label: "Head Office (北京)", sourceId: "src-pboc-cnaps", verified: true },
      { type: "BANK_CODE", value: "102", label: "ICBC bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Beijing", address: "55 Fuxingmen Nei Dajie, Xicheng District, Beijing" },
    ],
  },
  {
    slug: "bank-of-china",
    legalName: "Bank of China Limited",
    nameEn: "Bank of China",
    nameLocal: "中国银行股份有限公司",
    shortName: "Bank of China",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.boc.cn",
    identifiers: [
      { type: "SWIFT", value: "BKCHCNBJ", city: "Beijing", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "CNAPS", value: "104100000004", label: "Head Office (北京)", sourceId: "src-pboc-cnaps", verified: true },
      { type: "BANK_CODE", value: "104", label: "Bank of China bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Beijing", address: "1 Fuxingmen Nei Dajie, Xicheng District, Beijing" },
    ],
  },
  {
    slug: "china-construction-bank",
    legalName: "China Construction Bank Corporation",
    nameEn: "China Construction Bank",
    nameLocal: "中国建设银行股份有限公司",
    shortName: "CCB",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.ccb.com",
    identifiers: [
      { type: "SWIFT", value: "PCBCCNBJ", city: "Beijing", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "CNAPS", value: "105100000017", label: "Head Office (北京)", sourceId: "src-pboc-cnaps", verified: true },
      { type: "BANK_CODE", value: "105", label: "CCB bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Beijing", address: "25 Finance Street, Xicheng District, Beijing" },
    ],
  },
  {
    slug: "agricultural-bank-of-china",
    legalName: "Agricultural Bank of China Limited",
    nameEn: "Agricultural Bank of China",
    nameLocal: "中国农业银行股份有限公司",
    shortName: "ABC",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.abchina.com",
    identifiers: [
      { type: "SWIFT", value: "ABOCCNBJ", city: "Beijing", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "CNAPS", value: "103100000025", label: "Head Office (北京)", sourceId: "src-pboc-cnaps", verified: true },
      { type: "BANK_CODE", value: "103", label: "ABC bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Beijing", address: "69 Jianguomen Nei Dajie, Dongcheng District, Beijing" },
    ],
  },
  {
    slug: "bank-of-communications",
    legalName: "Bank of Communications Co., Ltd.",
    nameEn: "Bank of Communications",
    nameLocal: "交通银行股份有限公司",
    shortName: "BOCOM",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.bankcomm.com",
    identifiers: [
      { type: "SWIFT", value: "COMMCNSH", city: "Shanghai", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BANK_CODE", value: "301", label: "BOCOM bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Shanghai", address: "188 Yincheng Middle Road, Pudong New District, Shanghai" },
    ],
  },
  {
    slug: "china-merchants-bank",
    legalName: "China Merchants Bank Co., Ltd.",
    nameEn: "China Merchants Bank",
    nameLocal: "招商银行股份有限公司",
    shortName: "CMB",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.cmbchina.com",
    identifiers: [
      { type: "SWIFT", value: "CMBCCNBS", city: "Shenzhen", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Shenzhen", address: "7088 Shennan Avenue, Futian District, Shenzhen" },
    ],
  },
  {
    slug: "psbc",
    legalName: "Postal Savings Bank of China Co., Ltd.",
    nameEn: "Postal Savings Bank of China",
    nameLocal: "中国邮政储蓄银行股份有限公司",
    shortName: "PSBC",
    country: "CN",
    institutionType: "BANK",
    website: "https://www.psbc.com",
    identifiers: [
      { type: "SWIFT", value: "PSBCCNBJ", city: "Beijing", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BANK_CODE", value: "403", label: "PSBC bank code", sourceId: "src-pboc-cnaps", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", nameLocal: "总行", city: "Beijing", address: "3 Finance Street, Xicheng District, Beijing" },
    ],
  },

  // ── India ─────────────────────────────────────────────────────────────────
  {
    slug: "state-bank-of-india",
    legalName: "State Bank of India",
    nameEn: "State Bank of India",
    shortName: "SBI",
    country: "IN",
    institutionType: "BANK",
    website: "https://www.sbi.co.in",
    identifiers: [
      { type: "SWIFT", value: "SBININBB", city: "Mumbai", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Mumbai", address: "State Bank Bhavan, Madame Cama Road, Mumbai" },
    ],
  },
  {
    slug: "hdfc-bank",
    legalName: "HDFC Bank Ltd.",
    nameEn: "HDFC Bank",
    shortName: "HDFC Bank",
    country: "IN",
    institutionType: "BANK",
    website: "https://www.hdfcbank.com",
    identifiers: [
      { type: "SWIFT", value: "HDFCINBB", city: "Mumbai", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "IFSC", value: "HDFC0000001", label: "Head Office (Mumbai)", sourceId: "src-rbi-ifsc", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Mumbai", address: "HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai" },
    ],
  },
  {
    slug: "icici-bank",
    legalName: "ICICI Bank Ltd.",
    nameEn: "ICICI Bank",
    shortName: "ICICI Bank",
    country: "IN",
    institutionType: "BANK",
    website: "https://www.icicibank.com",
    identifiers: [
      { type: "SWIFT", value: "ICICINBB", city: "Mumbai", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "IFSC", value: "ICIC0000001", label: "Head Office", sourceId: "src-rbi-ifsc", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Mumbai", address: "ICICI Bank Towers, Bandra Kurla Complex, Mumbai" },
    ],
  },
  {
    slug: "axis-bank",
    legalName: "Axis Bank Ltd.",
    nameEn: "Axis Bank",
    shortName: "Axis Bank",
    country: "IN",
    institutionType: "BANK",
    website: "https://www.axisbank.com",
    identifiers: [
      { type: "SWIFT", value: "AXISINBB", city: "Mumbai", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "IFSC", value: "UTIB0000001", label: "Head Office (Mumbai)", sourceId: "src-rbi-ifsc", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Mumbai", address: "Corporate Office, Mumbai" },
    ],
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  {
    slug: "commonwealth-bank",
    legalName: "Commonwealth Bank of Australia",
    nameEn: "Commonwealth Bank of Australia",
    shortName: "CommBank",
    country: "AU",
    institutionType: "BANK",
    website: "https://www.commbank.com.au",
    identifiers: [
      { type: "SWIFT", value: "CTBAAU2S", city: "Sydney", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BSB", value: "062001", label: "Sydney", sourceId: "src-auspaynet", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Sydney" },
    ],
  },
  {
    slug: "westpac",
    legalName: "Westpac Banking Corporation",
    nameEn: "Westpac Banking Corporation",
    shortName: "Westpac",
    country: "AU",
    institutionType: "BANK",
    website: "https://www.westpac.com.au",
    identifiers: [
      { type: "SWIFT", value: "WPACAU2S", city: "Sydney", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BSB", value: "032002", label: "Westpac", sourceId: "src-auspaynet", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Sydney", address: "275 Kent Street, Sydney NSW" },
    ],
  },
  {
    slug: "national-australia-bank",
    legalName: "National Australia Bank Limited",
    nameEn: "National Australia Bank",
    shortName: "NAB",
    country: "AU",
    institutionType: "BANK",
    website: "https://www.nab.com.au",
    identifiers: [
      { type: "SWIFT", value: "NATAAU33", city: "Melbourne", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BSB", value: "082901", label: "NAB", sourceId: "src-auspaynet", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Melbourne", address: "800 Bourke Street, Docklands VIC" },
    ],
  },
  {
    slug: "anz",
    legalName: "Australia and New Zealand Banking Group Limited",
    nameEn: "ANZ",
    shortName: "ANZ",
    country: "AU",
    institutionType: "BANK",
    website: "https://www.anz.com.au",
    identifiers: [
      { type: "SWIFT", value: "ANZBAU3M", city: "Melbourne", label: "Head Office", sourceId: "src-swift-bic", verified: true },
      { type: "BSB", value: "012001", label: "ANZ", sourceId: "src-auspaynet", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Melbourne", address: "833 Collins Street, Docklands VIC" },
    ],
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  {
    slug: "toronto-dominion-bank",
    legalName: "The Toronto-Dominion Bank",
    nameEn: "Toronto-Dominion Bank",
    shortName: "TD",
    country: "CA",
    institutionType: "BANK",
    website: "https://www.td.com",
    identifiers: [
      { type: "SWIFT", value: "TDOMCATT", city: "Toronto", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Toronto", address: "66 Wellington Street West, Toronto, ON" },
    ],
  },
  {
    slug: "scotiabank",
    legalName: "The Bank of Nova Scotia",
    nameEn: "Scotiabank",
    shortName: "Scotiabank",
    country: "CA",
    institutionType: "BANK",
    website: "https://www.scotiabank.com",
    identifiers: [
      { type: "SWIFT", value: "NOSCCATT", city: "Toronto", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Toronto", address: "44 King Street West, Toronto, ON" },
    ],
  },
  {
    slug: "bank-of-montreal",
    legalName: "Bank of Montreal",
    nameEn: "Bank of Montreal",
    shortName: "BMO",
    country: "CA",
    institutionType: "BANK",
    website: "https://www.bmo.com",
    identifiers: [
      { type: "SWIFT", value: "BOFMCAM2", city: "Montreal", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Montreal" },
    ],
  },

  // ── Japan ─────────────────────────────────────────────────────────────────
  {
    slug: "mufg-bank",
    legalName: "MUFG Bank, Ltd.",
    nameEn: "MUFG Bank",
    shortName: "MUFG",
    country: "JP",
    institutionType: "BANK",
    website: "https://www.mufg.jp",
    identifiers: [
      { type: "SWIFT", value: "BOTKJPJT", city: "Tokyo", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Tokyo", address: "2-7-1 Marunouchi, Chiyoda City, Tokyo" },
    ],
  },
  {
    slug: "sumitomo-mitsui-banking-corporation",
    legalName: "Sumitomo Mitsui Banking Corporation",
    nameEn: "Sumitomo Mitsui Banking Corporation",
    shortName: "SMBC",
    country: "JP",
    institutionType: "BANK",
    website: "https://www.smbc.co.jp",
    identifiers: [
      { type: "SWIFT", value: "SMBCJPJT", city: "Tokyo", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Tokyo", address: "1-1 Marunouchi 1-chome, Chiyoda City, Tokyo" },
    ],
  },
  {
    slug: "mizuho-bank",
    legalName: "Mizuho Bank, Ltd.",
    nameEn: "Mizuho Bank",
    shortName: "Mizuho",
    country: "JP",
    institutionType: "BANK",
    website: "https://www.mizuhobank.com",
    identifiers: [
      { type: "SWIFT", value: "MHBKJPJT", city: "Tokyo", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Tokyo", address: "1-3-5 Otemachi, Chiyoda City, Tokyo" },
    ],
  },

  // ── Switzerland / Netherlands / Spain / Italy ─────────────────────────────
  {
    slug: "ubs-switzerland",
    legalName: "UBS Switzerland AG",
    nameEn: "UBS Switzerland",
    shortName: "UBS",
    country: "CH",
    institutionType: "BANK",
    website: "https://www.ubs.com",
    identifiers: [
      { type: "SWIFT", value: "UBSWCHZH", city: "Zurich", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Zurich", address: "Bahnhofstrasse 45, 8001 Zurich" },
    ],
  },
  {
    slug: "ing-bank",
    legalName: "ING Bank N.V.",
    nameEn: "ING Bank",
    shortName: "ING",
    country: "NL",
    institutionType: "BANK",
    website: "https://www.ing.com",
    identifiers: [
      { type: "SWIFT", value: "INGBNL2A", city: "Amsterdam", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Amsterdam" },
    ],
  },
  {
    slug: "abn-amro",
    legalName: "ABN AMRO Bank N.V.",
    nameEn: "ABN AMRO Bank",
    shortName: "ABN AMRO",
    country: "NL",
    institutionType: "BANK",
    website: "https://www.abnamro.com",
    identifiers: [
      { type: "SWIFT", value: "ABNANL2A", city: "Amsterdam", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Amsterdam", address: "Gustav Mahlerlaan 10, 1082 PP Amsterdam" },
    ],
  },
  {
    slug: "banco-santander",
    legalName: "Banco Santander, S.A.",
    nameEn: "Banco Santander",
    shortName: "Santander",
    country: "ES",
    institutionType: "BANK",
    website: "https://www.santander.com",
    identifiers: [
      { type: "SWIFT", value: "BSCHESMM", city: "Santander", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Santander", address: "Paseo de Pereda 9-12, 39004 Santander" },
    ],
  },
  {
    slug: "bbva",
    legalName: "Banco Bilbao Vizcaya Argentaria, S.A.",
    nameEn: "BBVA",
    shortName: "BBVA",
    country: "ES",
    institutionType: "BANK",
    website: "https://www.bbva.com",
    identifiers: [
      { type: "SWIFT", value: "BBVAESMM", city: "Bilbao", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Bilbao", address: "Plaza de San Nicolás 4, 48005 Bilbao" },
    ],
  },
  {
    slug: "intesa-sanpaolo",
    legalName: "Intesa Sanpaolo S.p.A.",
    nameEn: "Intesa Sanpaolo",
    shortName: "Intesa Sanpaolo",
    country: "IT",
    institutionType: "BANK",
    website: "https://www.intesasanpaolo.com",
    identifiers: [
      { type: "SWIFT", value: "BCITITMM", city: "Turin", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Turin", address: "Piazza San Carlo 156, 10121 Turin" },
    ],
  },

  // ── Hong Kong / Singapore ─────────────────────────────────────────────────
  {
    slug: "hsbc-hong-kong",
    legalName: "The Hongkong and Shanghai Banking Corporation Limited",
    nameEn: "The Hongkong and Shanghai Banking Corporation",
    shortName: "HSBC Hong Kong",
    country: "HK",
    institutionType: "BANK",
    website: "https://www.hsbc.com.hk",
    identifiers: [
      { type: "SWIFT", value: "HSBCHKHH", city: "Hong Kong", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Hong Kong", address: "1 Queen's Road Central, Hong Kong" },
    ],
  },
  {
    slug: "bank-of-china-hong-kong",
    legalName: "Bank of China (Hong Kong) Limited",
    nameEn: "Bank of China (Hong Kong)",
    nameLocal: "中國銀行(香港)有限公司",
    shortName: "BOCHK",
    country: "HK",
    institutionType: "BANK",
    website: "https://www.bochk.com",
    identifiers: [
      { type: "SWIFT", value: "BKCHHKHH", city: "Hong Kong", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Hong Kong", address: "Bank of China Tower, 1 Garden Road, Hong Kong" },
    ],
  },
  {
    slug: "dbs-bank",
    legalName: "DBS Bank Ltd.",
    nameEn: "DBS Bank",
    shortName: "DBS",
    country: "SG",
    institutionType: "BANK",
    website: "https://www.dbs.com.sg",
    identifiers: [
      { type: "SWIFT", value: "DBSSSGSG", city: "Singapore", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Singapore", address: "12 Marina Boulevard, Marina Bay Financial Centre Tower 3, Singapore" },
    ],
  },
  {
    slug: "united-overseas-bank",
    legalName: "United Overseas Bank Limited",
    nameEn: "United Overseas Bank",
    shortName: "UOB",
    country: "SG",
    institutionType: "BANK",
    website: "https://www.uobgroup.com",
    identifiers: [
      { type: "SWIFT", value: "UOVBSGSG", city: "Singapore", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Singapore", address: "UOB Plaza 1, 80 Raffles Place, Singapore" },
    ],
  },
  {
    slug: "ocbc",
    legalName: "Oversea-Chinese Banking Corporation Limited",
    nameEn: "Oversea-Chinese Banking Corporation",
    shortName: "OCBC",
    country: "SG",
    institutionType: "BANK",
    website: "https://www.ocbc.com",
    identifiers: [
      { type: "SWIFT", value: "OCBCSGSG", city: "Singapore", label: "Head Office", sourceId: "src-swift-bic", verified: true },
    ],
    branches: [
      { slug: "head-office", name: "Head Office", city: "Singapore", address: "OCBC Centre, 65 Chulia Street, Singapore" },
    ],
  },
];

export const institutionBySlug: Record<string, Institution> =
  Object.fromEntries(institutions.map((bank) => [bank.slug, bank]));
