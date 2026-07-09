"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LicenseStatusBadge, PaymentStatusBadge } from "@/components/crm/badges";
import { eur, LICENSE_STATUS_LABELS, LICENSE_STATUSES } from "@/lib/format";
import type { LicenseeRow } from "@/lib/queries";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function LicenseesView({
  licensees,
  categories,
}: {
  licensees: LicenseeRow[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [payment, setPayment] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = normalize(search);
    return licensees.filter((l) => {
      if (
        q &&
        !normalize(`${l.member.first_name} ${l.member.last_name}`).includes(q)
      )
        return false;
      if (status !== "all" && l.status !== status) return false;
      if (payment !== "all" && l.financials?.payment_status !== payment)
        return false;
      if (category !== "all" && l.tariff?.category !== category) return false;
      return true;
    });
  }, [licensees, search, status, payment, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un licencié…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut licence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {LICENSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LICENSE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout paiement</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
            <SelectItem value="partielle">Partielle</SelectItem>
            <SelectItem value="impayee">Impayée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/crm/licencies/nouveau">
            <UserPlus className="size-4" />
            Ajouter
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste">Liste ({filtered.length})</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="liste">
          <Card className="py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Licencié</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Dû</TableHead>
                    <TableHead className="text-right">Encaissé</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead>Mutation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Aucun licencié ne correspond aux filtres.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((l) => {
                    const f = l.financials;
                    const balance = Number(f?.balance ?? 0);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Link
                            href={`/crm/licencies/${l.id}`}
                            className="font-medium hover:underline"
                          >
                            {l.member.last_name.toUpperCase()}{" "}
                            {l.member.first_name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-44 truncate text-muted-foreground">
                          {l.tariff?.category ?? "—"}
                        </TableCell>
                        <TableCell>
                          <LicenseStatusBadge status={l.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge
                            status={f?.payment_status ?? null}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f?.total_due != null ? eur.format(f.total_due) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f?.total_paid != null
                            ? eur.format(f.total_paid)
                            : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            balance > 10 ? "text-orange-600" : "text-emerald-600"
                          }`}
                        >
                          {f?.balance != null ? eur.format(balance) : "—"}
                        </TableCell>
                        <TableCell>{l.is_mutation ? "Oui" : ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LICENSE_STATUSES.map((s) => {
              const cards = filtered.filter((l) => l.status === s);
              return (
                <Card key={s} className="gap-3">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {LICENSE_STATUS_LABELS[s]}
                      <span className="text-muted-foreground">
                        {cards.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cards.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Aucune licence
                      </p>
                    )}
                    {cards.map((l) => (
                      <Link
                        key={l.id}
                        href={`/crm/licencies/${l.id}`}
                        className="block rounded-md border bg-background p-3 transition-colors hover:bg-accent"
                      >
                        <div className="font-medium">
                          {l.member.last_name.toUpperCase()}{" "}
                          {l.member.first_name}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="max-w-32 truncate">
                            {l.tariff?.category ?? "Sans tarif"}
                          </span>
                          {l.financials?.balance != null &&
                            Number(l.financials.balance) > 10 && (
                              <span className="font-medium text-orange-600">
                                reste {eur.format(Number(l.financials.balance))}
                              </span>
                            )}
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
