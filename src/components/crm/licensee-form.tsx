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
import { findTeamFor, type Team } from "@/lib/planning";
import type { Member, License, Season } from "@/lib/queries";

export function LicenseeForm({
  season,
  tariffs,
  teams,
  member,
  license,
}: {
  season: Season;
  tariffs: Tariff[];
  teams: Team[];
  member?: Member;
  license?: License;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? "");
  const [sex, setSex] = useState(member?.sex ?? "");
  const [tariffChoice, setTariffChoice] = useState<string>(
    license?.tariff_id ?? "auto"
  );
  const [teamChoice, setTeamChoice] = useState<string>(
    license ? (license.team_id ?? "none") : "auto"
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

  const autoTeam = useMemo(
    () =>
      findTeamFor(
        teams,
        birthDate ? new Date(birthDate).getFullYear() : null,
        sex || null
      ),
    [teams, birthDate, sex]
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
            <Select name="sex" value={sex} onValueChange={setSex}>
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
          <div className="space-y-2 sm:col-span-2">
            <Label>Compétences (planning des matchs à domicile)</Label>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <span className="flex items-center gap-2">
                <Checkbox
                  id="can_table"
                  name="can_table"
                  defaultChecked={member?.can_table ?? true}
                />
                <Label htmlFor="can_table">Table de marque</Label>
              </span>
              <span className="flex items-center gap-2">
                <Checkbox
                  id="can_referee"
                  name="can_referee"
                  defaultChecked={member?.can_referee ?? false}
                />
                <Label htmlFor="can_referee">Arbitre</Label>
              </span>
              <span className="flex items-center gap-2">
                <Checkbox
                  id="can_hall_manager"
                  name="can_hall_manager"
                  defaultChecked={member?.can_hall_manager ?? false}
                />
                <Label htmlFor="can_hall_manager">Responsable de salle</Label>
              </span>
            </div>
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
            <Label htmlFor="team_id">Équipe</Label>
            <Select name="team_id" value={teamChoice} onValueChange={setTeamChoice}>
              <SelectTrigger id="team_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Automatique
                  {autoTeam ? ` — ${autoTeam.name}` : " (naissance + sexe requis)"}
                </SelectItem>
                <SelectItem value="none">Sans équipe</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[11px] border bg-secondary px-4 py-[13px]">
          <div className="text-sm">
            <div className="text-[11px] font-semibold text-[#9C958D]">
              Catégorie auto
            </div>
            <div className="font-bold">{effectiveTariff.category}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Fédé {eur.format(Number(effectiveTariff.part_ffhb))} + Ligue{" "}
              {eur.format(due.partLbhbEffective)}
              {due.discounted && (
                <span className="ml-1 font-semibold text-success">
                  (−5 % avant le 10/08 ✓)
                </span>
              )}{" "}
              + Club {eur.format(Number(effectiveTariff.part_hbc))}
            </div>
          </div>
          <div>
            <div className="text-right text-[11px] font-semibold text-[#9C958D]">
              Tarif calculé
            </div>
            <div className="font-display text-lg font-extrabold tabular-nums">
              {eur.format(due.total)}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg">
          {license ? "Enregistrer les modifications" : "Créer le licencié"}
        </Button>
      </div>
    </form>
  );
}
