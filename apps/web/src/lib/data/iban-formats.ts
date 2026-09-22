import type { IbanFormat } from "./types";

/**
 * IBAN country formats from the ISO 13616 registry.
 *
 * `structure` uses the registry notation:
 *   k = check digits, B = bank code, S = branch/sort code,
 *   C = account number, X = national check digits.
 *
 * Segment positions are 1-based indices into the full IBAN string and are
 * provided for countries with a stable, well-defined BBAN layout.
 */
export const ibanFormats: IbanFormat[] = [
  { countryCode: "AT", length: 20, structure: "ATkk BBBB BCCC CCCC CCCC", bankCode: { start: 5, length: 5 }, accountNumber: { start: 10, length: 11 }, example: "AT611904300234573201" },
  { countryCode: "BE", length: 16, structure: "BEkk BBBB CCCC CCCC KK", bankCode: { start: 5, length: 3 }, accountNumber: { start: 8, length: 7 }, nationalCheck: { start: 15, length: 2 }, example: "BE68539007547034" },
  { countryCode: "CH", length: 21, structure: "CHkk BBBB BCCC CCCC CCCC C", bankCode: { start: 5, length: 4 }, accountNumber: { start: 9, length: 13 }, example: "CH9300762011623852957" },
  { countryCode: "CY", length: 28, structure: "CYkk BBBS SSSC CCCC CCCC CCCC CCCC", example: "CY17002001280000001200527600" },
  { countryCode: "CZ", length: 24, structure: "CZkk BBBB SSSS SSCC CCCC CCCC" },
  { countryCode: "DE", length: 22, structure: "DEkk BBBB BBBB BBBB BBBB BB", bankCode: { start: 5, length: 8 }, accountNumber: { start: 13, length: 10 }, example: "DE89370400440532013000" },
  { countryCode: "DK", length: 18, structure: "DKkk BBBB CCCC CCCC CC", bankCode: { start: 5, length: 4 }, accountNumber: { start: 9, length: 10 }, example: "DK1700400440116643" },
  { countryCode: "EE", length: 20, structure: "EEkk BBSS CCCC CCCC CCCC K" },
  { countryCode: "ES", length: 24, structure: "ESkk BBBB SSSS XXCC CCCC CCCC", bankCode: { start: 5, length: 4 }, branchCode: { start: 9, length: 4 }, accountNumber: { start: 15, length: 10 }, example: "ES9121000418450200051332" },
  { countryCode: "FI", length: 18, structure: "FIkk BBBSSSC CCCCCC K", bankCode: { start: 5, length: 3 }, branchCode: { start: 8, length: 3 }, accountNumber: { start: 11, length: 7 }, example: "FI2112345600000785" },
  { countryCode: "FR", length: 27, structure: "FRkk BBBBB SSSSS CCCCCCCCCCC XX", bankCode: { start: 5, length: 5 }, branchCode: { start: 10, length: 5 }, accountNumber: { start: 15, length: 11 }, nationalCheck: { start: 26, length: 2 }, example: "FR1420041010050500013M02606" },
  { countryCode: "GB", length: 22, structure: "GBkk BBBB SSSS SSCC CCCC CC", bankCode: { start: 5, length: 4 }, branchCode: { start: 9, length: 6 }, accountNumber: { start: 15, length: 8 }, example: "GB29NWBK60161331926819" },
  { countryCode: "GR", length: 27, structure: "GRkk BBB SSSC CCCC CCCC CCCC CCCC", bankCode: { start: 5, length: 3 }, branchCode: { start: 8, length: 4 }, accountNumber: { start: 12, length: 16 }, example: "GR1601101250000000012300695" },
  { countryCode: "HR", length: 21, structure: "HRkk BBBB BBBB CCCC CCCC CCCC" },
  { countryCode: "HU", length: 28, structure: "HUkk BBBB SSSC CCCC CCCC CCCC CCCC" },
  { countryCode: "IE", length: 22, structure: "IEkk BBBB SSSS CCCC CCCC", bankCode: { start: 5, length: 4 }, branchCode: { start: 9, length: 6 }, accountNumber: { start: 15, length: 8 }, example: "IE29AIBK93115212345678" },
  { countryCode: "IT", length: 27, structure: "ITkk X AAAAA BBBBB CCCCCCCCCCCC X", bankCode: { start: 6, length: 5 }, branchCode: { start: 11, length: 5 }, accountNumber: { start: 16, length: 12 }, example: "IT60X0542811101000000123456" },
  { countryCode: "LT", length: 20, structure: "LTkk BBBB CCCC CCCC CCCC" },
  { countryCode: "LU", length: 20, structure: "LUkk BBB CCCC CCCC CCCC KK", bankCode: { start: 5, length: 3 }, accountNumber: { start: 8, length: 13 }, nationalCheck: { start: 21, length: 2 }, example: "LU280019400644750000" },
  { countryCode: "LV", length: 21, structure: "LVkk BBBB CCCC CCCC CCCC C" },
  { countryCode: "MT", length: 31, structure: "MTkk BBBB SSSS SCCC CCCC CCCC CCCC CCC", example: "MT47MALT01100001234567890123456" },
  { countryCode: "NL", length: 18, structure: "NLkk BBBB CCCC CCCC CC", bankCode: { start: 5, length: 4 }, accountNumber: { start: 9, length: 8 }, example: "NL91ABNA0417164300" },
  { countryCode: "NO", length: 15, structure: "NOkk BBBB CCCC CK", bankCode: { start: 5, length: 4 }, accountNumber: { start: 9, length: 6 }, nationalCheck: { start: 15, length: 1 }, example: "NO9386011117947" },
  { countryCode: "PL", length: 28, structure: "PLkk BBBB BBBB CCCC CCCC CCCC CCCC", example: "PL61109010140000071219812874" },
  { countryCode: "PT", length: 25, structure: "PTkk BBBB SSSS CCCC CCCC CCCC CCK", bankCode: { start: 5, length: 4 }, branchCode: { start: 9, length: 4 }, accountNumber: { start: 13, length: 11 }, nationalCheck: { start: 24, length: 2 }, example: "PT50000201231234567890154" },
  { countryCode: "RO", length: 24, structure: "ROkk BBBB CCCC CCCC CCCC CCCC" },
  { countryCode: "SE", length: 24, structure: "SEkk BBBB SSSC CCCC CCCC CCCC", example: "SE4550000000058398257466" },
  { countryCode: "SI", length: 19, structure: "SIkk BBSS SCCC CCCC C" },
  { countryCode: "SK", length: 24, structure: "SKkk BBBB SSSS SSCC CCCC CCCC" },
  { countryCode: "TR", length: 26, structure: "TRkk BBBB BCCC CCCC CCCC CCCC" },
];

export const ibanFormatByCountry: Record<string, IbanFormat> =
  Object.fromEntries(ibanFormats.map((format) => [format.countryCode, format]));
