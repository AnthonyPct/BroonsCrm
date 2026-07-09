import type { Tables } from "@/lib/database.types";

export type Tariff = Tables<"tariff_grid">;

/**
 * Catégorie auto : première ligne de la grille dont l'intervalle
 * d'années de naissance contient l'année donnée. Les lignes sans borne
 * (ex. Dirigeant) ne matchent jamais automatiquement.
 */
export function findTariffForBirthYear(
  tariffs: Tariff[],
  birthYear: number | null
): Tariff | null {
  if (!birthYear) return null;
  return (
    [...tariffs]
      .sort((a, b) => a.sort_order - b.sort_order)
      .find(
        (t) =>
          (t.birth_year_min !== null || t.birth_year_max !== null) &&
          (t.birth_year_min === null || birthYear >= t.birth_year_min) &&
          (t.birth_year_max === null || birthYear <= t.birth_year_max)
      ) ?? null
  );
}

export function tariffTotal(t: Pick<Tariff, "part_ffhb" | "part_lbhb" | "part_hbc">): number {
  return (
    Number(t.part_ffhb) + Number(t.part_lbhb) + Number(t.part_hbc)
  );
}

/** Dû avec réduction éventuelle sur la part ligue (registered <= deadline). */
export function computeDue(
  t: Pick<Tariff, "part_ffhb" | "part_lbhb" | "part_hbc">,
  registeredAt: string,
  discountDeadline: string,
  discountRate: number
): { discounted: boolean; partLbhbEffective: number; total: number } {
  const discounted = registeredAt <= discountDeadline;
  const partLbhbEffective =
    Math.round(Number(t.part_lbhb) * (1 - (discounted ? discountRate : 0)) * 100) /
    100;
  return {
    discounted,
    partLbhbEffective,
    total:
      Math.round(
        (Number(t.part_ffhb) + partLbhbEffective + Number(t.part_hbc)) * 100
      ) / 100,
  };
}
