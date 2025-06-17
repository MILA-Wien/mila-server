import { electronicFormatIBAN, isValidIBAN } from "ibantools";

const europeanIBAN = [
  "AD",
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

export function validateIban(
  value: string | undefined,
  context: { path: string },
  state: { [key: string]: unknown },
) {
  const iban = electronicFormatIBAN(value);
  state[context.path] = iban;

  if (iban && europeanIBAN.includes(iban.substring(0, 2))) {
    return isValidIBAN(iban || "");
  }

  return false;
}
