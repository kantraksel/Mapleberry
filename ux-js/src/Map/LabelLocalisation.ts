// OpenStreetMap Americana
// Licensed under Creative Commons Zero v1.0 Universal

/**
 * Returns a list of languages as a comma-delimited string from the given URL hash.
 */
function getLanguageFromURL(url: Location) {
  let language = new URLSearchParams(url.hash.substr(1)).get("language");
  return language === "" ? null : language;
}

/**
 * Returns the languages that the user prefers.
 */
export function getLocales() {
  // Check the language "parameter" in the hash.
  let parameter = getLanguageFromURL(window.location)?.split(",");
  // Fall back to the user's language preference.
  let userLocales = parameter ?? navigator.languages ?? [navigator.language];
  let locales = [];
  let localeSet = new Set(); // avoid duplicates
  for (let locale of userLocales) {
    // Add progressively less specific variants of each user-specified locale.
    let components = locale.split("-");
    while (components.length > 0) {
      let parent = components.join("-");
      if (!localeSet.has(parent)) locales.push(parent);
      localeSet.add(parent);
      components.pop();
    }
  }
  return locales;
}

/**
 * Returns a `coalesce` expression that resolves to the feature's name in a
 * language that the user prefers.
 *
 * @param {[string]} locales - Locales of the name fields to include.
 * @param {boolean} includesLegacyFields - Whether to include the older fields
 *  that include underscores, for layers that have not transitioned to the
 *  colon syntax.
 */
function getLocalizedNameExpression(locales: string[], includesLegacyFields: boolean) {
  let nameFields = [
    ...locales.flatMap((l) => {
      let fields = [`name:${l}`];
      // transportation_label uses an underscore instead of a colon.
      // https://github.com/openmaptiles/openmaptiles/issues/769
      if (includesLegacyFields && (l === "de" || l === "en"))
        fields.push(`name_${l}`);
      return fields;
    }),
    "name",
  ];
  return ["coalesce", ...nameFields.map((f) => ["get", f])];
}

/**
 * Replaces the value of a variable in the given `let` expression.
 *
 * @param {array} letExpr - Expression to update.
 * @param {string} variable - Name of the variable to set.
 * @param {*} value - The variable's new value.
 */
function updateVariable(letExpr: unknown[], variable: string, value: unknown) {
  if (!letExpr || letExpr[0] !== "let") return;

  let variableNameIndex = letExpr.indexOf(variable);
  if (variableNameIndex % 2 === 1) {
    letExpr[variableNameIndex + 1] = value;
  }
}

interface Layer {
  layout: { "text-field": unknown[] },
  "source-layer": string,
}

/**
 * Updates localizable variables at the top level of each layer's `text-field` expression based on the given locales.
 *
 * @param {[object]} layers - The style layers to localize.
 * @param {[string]} locales - The locales to insert into each layer.
 */
export function localizeLayers(layers: Layer[], locales: string[]) {
  let localizedNameExpression = getLocalizedNameExpression(locales, false);
  let legacyLocalizedNameExpression = getLocalizedNameExpression(locales, true);

  for (let layer of layers) {
    if ("layout" in layer && "text-field" in layer.layout) {
      let textField = layer.layout["text-field"];

      updateVariable(
        textField,
        "localizedName",
        // https://github.com/openmaptiles/openmaptiles/issues/769
        layer["source-layer"] === "transportation_name"
          ? legacyLocalizedNameExpression
          : localizedNameExpression
      );

      updateVariable(textField, "localizedCollator", [
        "collator",
        {
          "case-sensitive": false,
          "diacritic-sensitive": true,
          locale: locales[0],
        },
      ]);

      // Only perform diacritic folding in English. English normally uses few diacritics except when labeling foreign place names on maps.
      updateVariable(textField, "diacriticInsensitiveCollator", [
        "collator",
        {
          "case-sensitive": false,
          "diacritic-sensitive": !/^en\b/.test(locales[0]),
          locale: locales[0],
        },
      ]);
    }
  }

  let countryNames = new Intl.DisplayNames(locales, {
    type: "region",
    fallback: "none",
  });
  let localizedCountryNamesByCode = Object.fromEntries(
    Object.entries(iso3166_1_alpha_2_by_3).map((e) => [
      e[0],
      countryNames
        .of(e[1])
        // Neither the upcase expression operator nor the text-transform layout property is locale-aware, so uppercase the name upfront.
        ?.toLocaleUpperCase(locales)
        // Word boundaries are less discernible in uppercase text, so pad each word by an additional space.
        .replaceAll(" ", "  ") ?? null,
    ])
  );
  Object.assign(countryNamesByCode, localizedCountryNamesByCode);
}

/**
 * ISO 3166-1 alpha-2 country codes by ISO 3166-1 alpha-3 code.
 *
 * Source: https://www.cia.gov/the-world-factbook/references/country-data-codes/
 */
const iso3166_1_alpha_2_by_3 = {
  ABW: "AW",
  AFG: "AF",
  AGO: "AO",
  AIA: "AI",
  ALB: "AL",
  AND: "AD",
  ARE: "AE",
  ARG: "AR",
  ARM: "AM",
  ASM: "AS",
  ATA: "AQ",
  ATF: "TF",
  ATG: "AG",
  AUS: "AU",
  AUT: "AT",
  AZE: "AZ",
  BDI: "BI",
  BEL: "BE",
  BEN: "BJ",
  BFA: "BF",
  BGD: "BD",
  BGR: "BG",
  BHR: "BH",
  BHS: "BS",
  BIH: "BA",
  BLM: "BL",
  BLR: "BY",
  BLZ: "BZ",
  BMU: "BM",
  BOL: "BO",
  BRA: "BR",
  BRB: "BB",
  BRN: "BN",
  BTN: "BT",
  BVT: "BV",
  BWA: "BW",
  CAF: "CF",
  CAN: "CA",
  CCK: "CC",
  CHE: "CH",
  CHL: "CL",
  CHN: "CN",
  CIV: "CI",
  CMR: "CM",
  COD: "CD",
  COG: "CG",
  COK: "CK",
  COL: "CO",
  COM: "KM",
  CPV: "CV",
  CRI: "CR",
  CUB: "CU",
  CUW: "CW",
  CXR: "CX",
  CYM: "KY",
  CYP: "CY",
  CZE: "CZ",
  DEU: "DE",
  DJI: "DJ",
  DMA: "DM",
  DNK: "DK",
  DOM: "DO",
  DZA: "DZ",
  ECU: "EC",
  EGY: "EG",
  ERI: "ER",
  ESH: "EH",
  ESP: "ES",
  EST: "EE",
  ETH: "ET",
  FIN: "FI",
  FJI: "FJ",
  FLK: "FK",
  FRA: "FR",
  FRO: "FO",
  FSM: "FM",
  FXX: "FX",
  GAB: "GA",
  GBR: "GB",
  GEO: "GE",
  GGY: "GG",
  GHA: "GH",
  GIB: "GI",
  GIN: "GN",
  GLP: "GP",
  GMB: "GM",
  GNB: "GW",
  GNQ: "GQ",
  GRC: "GR",
  GRD: "GD",
  GRL: "GL",
  GTM: "GT",
  GUF: "GF",
  GUM: "GU",
  GUY: "GY",
  HKG: "HK",
  HMD: "HM",
  HND: "HN",
  HRV: "HR",
  HTI: "HT",
  HUN: "HU",
  IDN: "ID",
  IMN: "IM",
  IND: "IN",
  IOT: "IO",
  IRL: "IE",
  IRN: "IR",
  IRQ: "IQ",
  ISL: "IS",
  ISR: "IL",
  ITA: "IT",
  JAM: "JM",
  JEY: "JE",
  JOR: "JO",
  JPN: "JP",
  KAZ: "KZ",
  KEN: "KE",
  KGZ: "KG",
  KHM: "KH",
  KIR: "KI",
  KNA: "KN",
  KOR: "KR",
  KWT: "KW",
  LAO: "LA",
  LBN: "LB",
  LBR: "LR",
  LBY: "LY",
  LCA: "LC",
  LIE: "LI",
  LKA: "LK",
  LSO: "LS",
  LTU: "LT",
  LUX: "LU",
  LVA: "LV",
  MAC: "MO",
  MAF: "MF",
  MAR: "MA",
  MCO: "MC",
  MDA: "MD",
  MDG: "MG",
  MDV: "MV",
  MEX: "MX",
  MHL: "MH",
  MKD: "MK",
  MLI: "ML",
  MLT: "MT",
  MMR: "MM",
  MNE: "ME",
  MNG: "MN",
  MNP: "MP",
  MOZ: "MZ",
  MRT: "MR",
  MSR: "MS",
  MTQ: "MQ",
  MUS: "MU",
  MWI: "MW",
  MYS: "MY",
  MYT: "YT",
  NAM: "NA",
  NCL: "NC",
  NER: "NE",
  NFK: "NF",
  NGA: "NG",
  NIC: "NI",
  NIU: "NU",
  NLD: "NL",
  NOR: "NO",
  NPL: "NP",
  NRU: "NR",
  NZL: "NZ",
  OMN: "OM",
  PAK: "PK",
  PAN: "PA",
  PCN: "PN",
  PER: "PE",
  PHL: "PH",
  PLW: "PW",
  PNG: "PG",
  POL: "PL",
  PRI: "PR",
  PRK: "KP",
  PRT: "PT",
  PRY: "PY",
  PSE: "PS",
  PYF: "PF",
  QAT: "QA",
  REU: "RE",
  ROU: "RO",
  RUS: "RU",
  RWA: "RW",
  SAU: "SA",
  SDN: "SD",
  SEN: "SN",
  SGP: "SG",
  SGS: "GS",
  SHN: "SH",
  SJM: "SJ",
  SLB: "SB",
  SLE: "SL",
  SLV: "SV",
  SMR: "SM",
  SOM: "SO",
  SPM: "PM",
  SRB: "RS",
  SSD: "SS",
  STP: "ST",
  SUR: "SR",
  SVK: "SK",
  SVN: "SI",
  SWE: "SE",
  SWZ: "SZ",
  SXM: "SX",
  SYC: "SC",
  SYR: "SY",
  TCA: "TC",
  TCD: "TD",
  TGO: "TG",
  THA: "TH",
  TJK: "TJ",
  TKL: "TK",
  TKM: "TM",
  TLS: "TL",
  TON: "TO",
  TTO: "TT",
  TUN: "TN",
  TUR: "TR",
  TUV: "TV",
  TWN: "TW",
  TZA: "TZ",
  UGA: "UG",
  UKR: "UA",
  UMI: "UM",
  URY: "UY",
  USA: "US",
  UZB: "UZ",
  VAT: "VA",
  VCT: "VC",
  VEN: "VE",
  VGB: "VG",
  VIR: "VI",
  VNM: "VN",
  VUT: "VU",
  WLF: "WF",
  WSM: "WS",
  YEM: "YE",
  ZAF: "ZA",
  ZMB: "ZM",
  ZWE: "ZW",
};

/**
 * Country names in the user's preferred language by ISO 3166-1 alpha-3 code.
 */
let countryNamesByCode = {};
