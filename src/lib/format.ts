export const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    typeof date === "string" ? new Date(date) : date
  );
}

export const LICENSE_STATUS_LABELS: Record<string, string> = {
  a_saisir: "À saisir",
  attente_paiement: "En attente de paiement",
  payee: "Payée",
  qualifiee: "Qualifiée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  payee: "Payée",
  partielle: "Partielle",
  impayee: "Impayée",
  inconnu: "Tarif manquant",
};

export const PAYMENT_SOURCE_LABELS: Record<string, string> = {
  helloasso: "HelloAsso",
  passsport: "Pass'Sport",
  cheque: "Chèque",
  espece: "Espèces",
  ancv: "ANCV",
  caf: "CAF Chèque Loisirs",
  offert: "Offert (bureau)",
};

export const LICENSE_STATUSES = [
  "a_saisir",
  "attente_paiement",
  "payee",
  "qualifiee",
] as const;

export const PAYMENT_SOURCES = [
  "helloasso",
  "passsport",
  "cheque",
  "espece",
  "ancv",
  "caf",
  "offert",
] as const;
