import { useMemo, useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { ALL_DISTRICTS, MUNICIPALITIES, municipalitiesOf, provinceOfDistrict } from "@/lib/nepal";
import type { LocationValue } from "./LocationFields";
import { cn } from "@/lib/utils";

interface Place {
  district: { en: string; ne: string };
  municipality: { en: string; ne: string } | null;
}

/** Every district, and the municipalities we have lists for - one searchable list. */
const PLACES: Place[] = [
  ...Object.entries(MUNICIPALITIES).flatMap(([district, list]) => {
    const d = ALL_DISTRICTS.find((x) => x.en === district) ?? { en: district, ne: district };
    return list.map((m) => ({ district: d, municipality: m }));
  }),
  ...ALL_DISTRICTS.map((d) => ({ district: d, municipality: null })),
];

const MAX_RESULTS = 8;

function search(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const score = (p: Place) => {
    const names = [p.municipality?.en, p.municipality?.ne, p.district.en, p.district.ne].filter(Boolean) as string[];
    const lower = names.map((n) => n.toLowerCase());
    if (lower.some((n) => n.startsWith(q))) return 0;
    if (lower.some((n) => n.split(/[\s-]/).some((w) => w.startsWith(q)))) return 1;
    if (lower.some((n) => n.includes(q))) return 2;
    return 99;
  };
  return PLACES.map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s < 99)
    // Best match first; a district before its own municipalities at the same score.
    .sort((a, b) => a.s - b.s || Number(Boolean(a.p.municipality)) - Number(Boolean(b.p.municipality)))
    .slice(0, MAX_RESULTS)
    .map((x) => x.p);
}

/**
 * Where you are, in one search box: type a few letters of your municipality
 * or district and pick it - the province follows by itself. Municipality
 * (where it wasn't picked), ward and area wait behind an optional link.
 */
export function PlaceSearch({
  value,
  onChange,
  error,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  error?: string;
}) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(Boolean(value.ward || value.locality));
  const results = useMemo(() => search(query), [query]);
  const name = (n: { en: string; ne: string }) => (lang === "ne" ? n.ne : n.en);
  const known = municipalitiesOf(value.district);

  function pick(place: Place) {
    onChange({
      province: provinceOfDistrict(place.district.en)?.name_en ?? null,
      district: place.district.en,
      municipality: place.municipality?.en ?? null,
      ward: null,
      locality: null,
    });
    setQuery("");
  }

  function clear() {
    onChange({ province: null, district: null, municipality: null, ward: null, locality: null });
    setMore(false);
  }

  const chosen = value.district
    ? [
        value.municipality
          ? (known.find((m) => m.en === value.municipality) ?? { en: value.municipality, ne: value.municipality })
          : null,
        ALL_DISTRICTS.find((d) => d.en === value.district) ?? { en: value.district, ne: value.district },
      ]
        .filter((n): n is { en: string; ne: string } => Boolean(n))
        .map(name)
        .join(", ")
    : null;

  return (
    <div>
      {chosen ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-600 bg-brand-50 px-3 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-semibold text-brand-900">{chosen}</span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
          >
            {t("placeChange")}
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeSearchPlaceholder")}
              aria-label={t("placeSearchPlaceholder")}
              aria-invalid={Boolean(error)}
              className={cn("h-12 pl-9 pr-9", error && "border-red-400")}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                aria-label={t("activityClearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {results.length > 0 ? (
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-surface">
              {results.map((p) => (
                <li key={`${p.district.en}|${p.municipality?.en ?? ""}`}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {name(p.municipality ?? p.district)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {[p.municipality && name(p.district), (() => {
                          const prov = provinceOfDistrict(p.district.en);
                          return prov ? (lang === "ne" ? prov.name_ne : prov.name_en) : null;
                        })()]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 ? (
            <p className="mt-2 text-xs text-slate-500">{t("placeNoMatch")}</p>
          ) : null}
        </>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}

      {value.district && (
        <>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            {value.municipality ? t("placeMoreWard") : t("placeMoreAll")}
            <ChevronDown className={cn("h-4 w-4 transition-transform", more && "rotate-180")} aria-hidden />
          </button>
          {more && (
            <div className="mt-3 space-y-0">
              {!value.municipality && (
                <Field label={t("municipality")}>
                  {known.length > 0 ? (
                    <Select
                      value={value.municipality ?? ""}
                      onChange={(e) => onChange({ ...value, municipality: e.target.value || null })}
                    >
                      <option value="">-</option>
                      {known.map((m) => (
                        <option key={m.en} value={m.en}>
                          {name(m)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={value.municipality ?? ""}
                      onChange={(e) => onChange({ ...value, municipality: e.target.value || null })}
                      placeholder={t("municipality")}
                      maxLength={80}
                    />
                  )}
                </Field>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("ward")} className="col-span-1 mb-0">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={40}
                    value={value.ward ?? ""}
                    onChange={(e) => onChange({ ...value, ward: e.target.value ? Number(e.target.value) : null })}
                  />
                </Field>
                <Field label={t("locality")} className="col-span-2 mb-0">
                  <Input
                    value={value.locality ?? ""}
                    onChange={(e) => onChange({ ...value, locality: e.target.value || null })}
                    maxLength={60}
                  />
                </Field>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
