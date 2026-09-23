"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, MapPin, Trophy } from "lucide-react";
import { cleanOpponentLabel, fdmPdfUrl } from "@/lib/ffhb";
import {
  groupByWeekend,
  mapsUrl,
  outcome,
  prettyName,
  shortWeekday,
  weekendLabel,
  type PublicMatch,
  type PublicTeam,
} from "@/lib/matchs";
import { cn } from "@/lib/utils";

type Tab = "a-venir" | "resultats";

const OUTCOME_STYLES: Record<"V" | "N" | "D", string> = {
  V: "bg-success-bg text-success",
  N: "bg-muted text-muted-foreground",
  D: "bg-accent text-primary",
};

export function MatchsBrowser({
  teams,
  upcoming,
  results,
}: {
  teams: PublicTeam[];
  upcoming: PublicMatch[];
  results: PublicMatch[];
}) {
  const [tab, setTab] = useState<Tab>("a-venir");
  const [teamId, setTeamId] = useState<string | null>(null);

  // L'onglet vit dans le hash : un lien « /matchs#resultats » se partage, et
  // la page reste statique (des searchParams la rendraient dynamique).
  useEffect(() => {
    const read = () => setTab(window.location.hash === "#resultats" ? "resultats" : "a-venir");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", next === "resultats" ? "#resultats" : window.location.pathname);
  }

  const groups = useMemo(() => {
    const source = tab === "a-venir" ? upcoming : results;
    const filtered = teamId ? source.filter((m) => m.team_id === teamId) : source;
    return groupByWeekend(filtered, tab === "a-venir" ? "asc" : "desc");
  }, [tab, teamId, upcoming, results]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="inline-flex self-start rounded-xl border bg-card p-1">
          {(
            [
              ["a-venir", "À venir", upcoming.length],
              ["resultats", "Résultats", results.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => selectTab(value)}
              className={cn(
                "rounded-lg px-4 py-2 text-[13.5px] font-bold transition-colors",
                tab === value
                  ? "bg-[#17130F] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className={cn("ml-1.5 text-[12px]", tab === value ? "text-[#c9c1b6]" : "text-[#9C958D]")}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {teams.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={teamId === null} onClick={() => setTeamId(null)}>
              Toutes
            </Chip>
            {teams.map((team) => (
              <Chip key={team.id} active={teamId === team.id} onClick={() => setTeamId(team.id)}>
                {team.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {groups.length === 0 && <EmptyState tab={tab} filtered={teamId !== null} />}

      {groups.map((group) => {
        const multiDay = new Set(group.matches.map((m) => m.day)).size > 1;
        return (
          <section
            key={group.start}
            className="overflow-hidden rounded-[18px] border bg-card shadow-[0_1px_3px_rgba(0,0,0,.04)]"
          >
            <header className="flex flex-wrap items-center gap-3 bg-[#17130F] px-5 py-4 text-white sm:px-6">
              <h2 className="font-display text-lg font-extrabold">{weekendLabel(group)}</h2>
              {tab === "a-venir" && <HallManager matches={group.matches} />}
            </header>
            <div>
              {group.matches.map((m) => (
                <MatchRow key={m.key} match={m} showDay={multiDay} isResult={tab === "resultats"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "bg-card text-muted-foreground hover:border-[#c9c1b6] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Un seul responsable de salle par journée : on l'affiche dans l'en-tête. */
function HallManager({ matches }: { matches: PublicMatch[] }) {
  const managers = [
    ...new Set(matches.map((m) => m.planning?.hall_manager).filter(Boolean) as string[]),
  ];
  if (managers.length === 0) return null;
  return (
    <span className="ml-auto text-[12.5px] font-semibold text-[#c9c1b6]">
      Responsable de salle : {managers.map(prettyName).join(", ")}
    </span>
  );
}

function MatchRow({
  match: m,
  showDay,
  isResult,
}: {
  match: PublicMatch;
  showDay: boolean;
  isResult: boolean;
}) {
  const result = outcome(m);
  const opponent = cleanOpponentLabel(m.opponent) || m.opponent;

  return (
    <div className="flex gap-4 border-b border-muted px-5 py-4 last:border-b-0 sm:px-6">
      <div className="w-[58px] shrink-0 pt-0.5">
        {showDay && (
          <div className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[#9C958D]">
            {shortWeekday(m.day)}
          </div>
        )}
        <div className="font-display text-lg font-extrabold leading-tight text-primary">
          {m.time ?? "--h--"}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-[15px] font-bold">{m.team}</span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[.04em]",
              m.home ? "bg-accent text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {m.home ? "Domicile" : "Extérieur"}
          </span>
        </div>
        <div className="mt-0.5 text-[14px] text-muted-foreground">
          {m.home ? "vs" : "chez"} {opponent}
        </div>
        <Details match={m} />
      </div>

      {m.played && m.score_for !== null && m.score_against !== null ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-display text-[20px] font-black tabular-nums leading-none">
            {m.score_for}
            <span className="mx-1 text-[#c3bcb0]">–</span>
            {m.score_against}
          </span>
          {result && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-extrabold",
                OUTCOME_STYLES[result],
              )}
            >
              {result === "V" ? "Victoire" : result === "N" ? "Nul" : "Défaite"}
            </span>
          )}
        </div>
      ) : (
        // Dans les résultats, un match sans score est forcément passé.
        isResult && (
          <span className="shrink-0 self-center text-[12px] font-semibold text-[#9C958D]">
            Score à venir
          </span>
        )
      )}
    </div>
  );
}

function Details({ match: m }: { match: PublicMatch }) {
  const items: React.ReactNode[] = [];

  if (m.date_tbc) {
    items.push(<span key="tbc">Date et horaire à confirmer</span>);
  }

  if (m.home) {
    items.push(
      <span key="salle" className="inline-flex items-center gap-1">
        <MapPin className="size-3.5" /> Salle du Chalet, Broons
      </span>,
    );
  } else if (m.venue) {
    const url = mapsUrl(m.venue);
    // Le libellé de salle garde ses sigles (« SOS », « COSEC ») ; la ville,
    // elle, n'en a pas (« MONTFORT SUR MEU »).
    const label = [
      m.venue.libelle && cleanOpponentLabel(m.venue.libelle),
      m.venue.ville && prettyName(m.venue.ville),
    ]
      .filter(Boolean)
      .join(", ");
    items.push(
      url ? (
        <a
          key="salle"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline-offset-2 hover:text-primary hover:underline"
        >
          <MapPin className="size-3.5" /> {label}
        </a>
      ) : (
        <span key="salle" className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {label}
        </span>
      ),
    );
  }

  // Planning de salle : seulement pour un match à venir, une fois la journée
  // préparée dans le CRM.
  if (m.planning && !m.played) {
    const a = m.planning.assignments;
    const table = [a.table_1, a.table_2].filter(Boolean).map(prettyName).join(" & ");
    const referee = m.is_youth ? (a.referee ? prettyName(a.referee) : null) : "désigné par le comité";
    if (table) items.push(<span key="table">Table : {table}</span>);
    if (referee) items.push(<span key="arbitre">Arbitre : {referee}</span>);
  }

  if (m.played && m.fdm_code) {
    items.push(
      <a
        key="fdm"
        href={fdmPdfUrl(m.fdm_code)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline-offset-2 hover:text-primary hover:underline"
      >
        <FileText className="size-3.5" /> Feuille de match
      </a>,
    );
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#9C958D]">{items}</div>
  );
}

function EmptyState({ tab, filtered }: { tab: Tab; filtered: boolean }) {
  const Icon = tab === "a-venir" ? CalendarDays : Trophy;
  return (
    <div className="rounded-[18px] border bg-card px-6 py-14 text-center">
      <Icon className="mx-auto size-10 text-[#c3bcb0]" />
      <h2 className="mt-4 font-display text-xl font-extrabold">
        {tab === "a-venir" ? "Pas de match ces deux week-ends" : "Pas encore de résultat"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {filtered
          ? "Rien pour cette équipe — essayez « Toutes »."
          : tab === "a-venir"
            ? "Les prochains matchs apparaîtront ici dès qu'ils seront programmés."
            : "Les scores s'affichent ici après chaque week-end de championnat."}
      </p>
    </div>
  );
}

