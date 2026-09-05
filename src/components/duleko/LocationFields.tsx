import { Field, Input, Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { PROVINCES, districtsOf, municipalitiesOf, provinceOfDistrict } from "@/lib/nepal";

export interface LocationValue {
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  locality: string | null;
}

/**
 * Province → district → municipality, with municipality falling back to free
 * text outside the launch districts, where we have no local-body list yet.
 */
export function LocationFields({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const { t, lang } = useI18n();
  const provinceId = PROVINCES.find((p) => p.name_en === value.province)?.id ?? null;
  const districts = districtsOf(provinceId);
  const knownMunicipalities = municipalitiesOf(value.district);

  function set(patch: Partial<LocationValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <>
      <Field label={t("province")}>
        <Select
          value={value.province ?? ""}
          onChange={(e) => {
            const name = e.target.value || null;
            set({ province: name, district: null, municipality: null });
          }}
        >
          <option value="">{t("selectProvince")}</option>
          {PROVINCES.map((p) => (
            <option key={p.id} value={p.name_en}>
              {lang === "ne" ? p.name_ne : p.name_en}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("district")}>
        <Select
          value={value.district ?? ""}
          onChange={(e) => {
            const district = e.target.value || null;
            const province = provinceOfDistrict(district)?.name_en ?? value.province;
            set({ district, province, municipality: null });
          }}
        >
          <option value="">{t("selectDistrict")}</option>
          {districts.map((d) => (
            <option key={d.en} value={d.en}>
              {lang === "ne" ? d.ne : d.en}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("municipality")}>
        {knownMunicipalities.length > 0 ? (
          <Select
            value={value.municipality ?? ""}
            onChange={(e) => set({ municipality: e.target.value || null })}
          >
            <option value="">—</option>
            {knownMunicipalities.map((m) => (
              <option key={m.en} value={m.en}>
                {lang === "ne" ? m.ne : m.en}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={value.municipality ?? ""}
            onChange={(e) => set({ municipality: e.target.value || null })}
            placeholder={t("municipality")}
          />
        )}
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t("ward")} className="col-span-1">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            value={value.ward ?? ""}
            onChange={(e) => set({ ward: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label={t("locality")} className="col-span-2">
          <Input
            value={value.locality ?? ""}
            onChange={(e) => set({ locality: e.target.value || null })}
            maxLength={60}
          />
        </Field>
      </div>
    </>
  );
}
