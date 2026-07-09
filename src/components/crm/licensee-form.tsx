"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveLicensee } from "@/app/actions/licencies";
import { eur, LICENSE_STATUS_LABELS, LICENSE_STATUSES } from "@/lib/format";
import { computeDue, findTariffForBirthYear, type Tariff } from "@/lib/tariffs";
import type { Member, License, Season } from "@/lib/queries";

export function LicenseeForm({
  season,
  tariffs,
  member,
  license,
}: {
  season: Season;
  tariffs: Tariff[];
  member?: Member;
  license?: License;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? "");
  const [tariffChoice, setTariffChoice] = useState<string>(
    license?.tariff_id ?? "auto"
  );
  const [registeredAt, setRegisteredAt] = useState(
    license?.registered_at ?? today
  );

  const autoTariff = useMemo(
    () =>
      findTariffForBirthYear(
        tariffs,
        birthDate ? new Date(birthDate).getFullYear() : null
      ),
    [tariffs, birthDate]
  );

  const effectiveTariff =
    tariffChoice === "auto"
      ? autoTariff
      : tariffs.find((t) => t.id === tariffChoice) ?? null;

  const due = effectiveTariff
    ? computeDue(
        effectiveTariff,
        registeredAt,
        season.discount_deadline,
        Number(season.discount_rate)
      )
    : null;

  return (
    <form action={saveLicensee} className="space-y-6">
      {member && <input type="hidden" name="member_id" value={member.id} />}
      {license && <input type="hidden" name="license_id" value={license.id} />}
      <input type="hidden" name="season_id" value={season.id} />

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom *</Label>
            <Input
              id="last_name"
              name="last_name"
              required
              defaultValue={member?.last_name ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom *</Label>
            <Input
              id="first_name"
              name="first_name"
              required
              defaultValue={member?.first_name ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Date de naissance</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex">Sexe</Label>
            <Select name="sex" defaultValue={member?.sex ?? undefined}>
              <SelectTrigger id="sex" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Féminin</SelectItem>
                <SelectItem value="M">Masculin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={member?.email ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" defaultValue={member?.phone ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              name="address"
              defaultValue={member?.address ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Code postal</Label>
            <Input
              id="postal_code"
              name="postal_code"
              defaultValue={member?.postal_code ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" defaultValue={member?.city ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_board"
              name="is_board"
              defaultChecked={member?.is_board ?? false}
            />
            <Label htmlFor="is_board">Membre du bureau</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Licence {season.label}</CardTitle>
          <CardDescription>
            La catégorie est déterminée automatiquement par l&apos;année de
            naissance. Vous pouvez la forcer si besoin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tariff_id">Catégorie / tarif</Label>
            <Select
              name="tariff_id"
              value={tariffChoice}
              onValueChange={setTariffChoice}
            >
              <SelectTrigger id="tariff_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Automatique
                  {autoTariff ? ` — ${autoTariff.category}` : " (date requise)"}
                </SelectItem>
                {tariffs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="registered_at">Date de prise de licence</Label>
            <Input
              id="registered_at"
              name="registered_at"
              type="date"
              value={registeredAt}
              onChange={(e) => setRegisteredAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team">Équipe</Label>
            <Input id="team" name="team" defaultValue={license?.team ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select name="status" defaultValue={license?.status ?? "a_saisir"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LICENSE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_mutation"
              name="is_mutation"
              defaultChecked={license?.is_mutation ?? false}
            />
            <Label htmlFor="is_mutation">Mutation</Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="license_notes">Notes</Label>
            <Textarea
              id="license_notes"
              name="license_notes"
              defaultValue={license?.notes ?? ""}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {due && effectiveTariff && (
        <Card className="border-[oklch(0.78_0.14_75)] bg-[oklch(0.78_0.14_75)]/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="text-sm">
              <div className="font-semibold">{effectiveTariff.category}</div>
              <div className="text-muted-foreground">
                Fédé {eur.format(Number(effectiveTariff.part_ffhb))} + Ligue{" "}
                {eur.format(due.partLbhbEffective)}
                {due.discounted && (
                  <span className="ml-1 font-medium text-emerald-700">
                    (−5 % avant le 10/08 ✓)
                  </span>
                )}{" "}
                + Club {eur.format(Number(effectiveTariff.part_hbc))}
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {eur.format(due.total)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg">
          {license ? "Enregistrer les modifications" : "Créer le licencié"}
        </Button>
      </div>
    </form>
  );
}
