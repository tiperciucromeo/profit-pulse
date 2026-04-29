/**
 * Calcule profitabilitate – o singură sursă de adevăr.
 * Documentație formule pentru verificare.
 */

export type RowCalc = {
  sumaFacturata: number;
  totalCostProductie: number;
  profitComanda: number;
  isStorno: boolean;
  inv?: { storno?: string };
};

/**
 * Total Suma Facturată (net) = sumă toate facturile, inclusiv documentele storno (negative).
 */
export function calcTotalNet(rows: RowCalc[]): number {
  return rows.reduce((s, r) => s + r.sumaFacturata, 0);
}

/**
 * Suma facturilor stornate = sumă doar facturile cu minus (valoare negativă).
 */
export function calcSumaDocumenteStorno(rows: RowCalc[]): number {
  return rows
    .filter((r) => r.sumaFacturata < 0)
    .reduce((s, r) => s + r.sumaFacturata, 0);
}

/**
 * Total Fără Storno = Net + |Suma storno| = suma doar facturilor pozitive.
 * Formula: Net - sumaDocumenteStorno (sumaDocumenteStorno e negativă).
 */
export function calcTotalFaraStorno(totalNet: number, sumaDocumenteStorno: number): number {
  return totalNet - sumaDocumenteStorno;
}

/**
 * TVA din sumă (preț cu TVA inclus).
 * Formula: suma * rate / (100 + rate)
 */
export function calcTvaDinSuma(suma: number, ratePercent: number): number {
  if (ratePercent <= 0 || suma <= 0) return 0;
  return (suma * ratePercent) / (100 + ratePercent);
}

/**
 * Profit Final = Suma Net − TVA Facturată − Cost Producție − Cheltuieli + TVA Cheltuieli (deductibil).
 */
export function calcProfitFinal(
  totalSumaNet: number,
  tvaDinSuma: number,
  totalCostProductie: number,
  sumaCheltuieli: number,
  sumaTvaCheltuieli: number
): number {
  return totalSumaNet - tvaDinSuma - totalCostProductie - sumaCheltuieli + sumaTvaCheltuieli;
}
