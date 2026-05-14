import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { pToRupee } from "@kothi/shared/types/budget";
import {
  computeWeightedKoytaCount,
  RATE_PER_TON_PAISE,
  DEFAULT_TONS_PER_VEHICLE,
  RATES_VERSION_ID,
} from "@kothi/shared/types/tracker";
import type { VehicleType, KoytaType } from "@kothi/shared/types/tracker";
import { useTrackerStore } from "./store";

interface OnboardingForm {
  koytaType: KoytaType;
  advanceThisYear: string;
  outstandingLastYear: string;
  migrationDays: string;
  fullKoytaMen: string;
  fullKoytaWomen: string;
  halfKoytaMen: string;
  halfKoytaWomen: string;
  boysHelping: string;
  girlsHelping: string;
  vehicleType: VehicleType;
  tonsPerVehicle: string;
  startDate: string;
  factoryName: string;
  factoryVillage: string;
  facoryTaluka: string;
  factoryDistrict: string;
  mukadam: string;
  mukadamPhone: string;
}

const VEHICLE_TYPES: VehicleType[] = ["tractor", "truck", "chakda", "bullock_cart"];

export function TrackerToli() {
  const { t } = useTranslation();
  const { state, setOnboarding } = useTrackerStore();
  const [editing, setEditing] = useState(!state.onboarding);

  const ob = state.onboarding;

  const { register, handleSubmit, watch, formState: { isValid } } = useForm<OnboardingForm>({
    mode: "onChange",
    defaultValues: ob
      ? {
          koytaType: ob.koytaType,
          advanceThisYear: pToRupee(ob.advanceTakenThisYearPaise),
          outstandingLastYear: pToRupee(ob.outstandingLastYearPaise),
          migrationDays: String(ob.migrationDistanceDays),
          fullKoytaMen: String(ob.toli.fullKoytaMen),
          fullKoytaWomen: String(ob.toli.fullKoytaWomen),
          halfKoytaMen: String(ob.toli.halfKoytaMen),
          halfKoytaWomen: String(ob.toli.halfKoytaWomen),
          boysHelping: String(ob.toli.boysHelping),
          girlsHelping: String(ob.toli.girlsHelping),
          vehicleType: ob.vehicle.type,
          tonsPerVehicle: String(ob.vehicle.tonsPerVehicle),
          startDate: ob.startDate,
          factoryName: ob.targetFactory.name,
          factoryVillage: ob.targetFactory.village,
          facoryTaluka: ob.targetFactory.taluka,
          factoryDistrict: ob.targetFactory.district,
          mukadam: ob.mukadam.name,
          mukadamPhone: ob.mukadam.phoneE164,
        }
      : {
          koytaType: "full",
          vehicleType: "tractor",
          tonsPerVehicle: "3",
          startDate: new Date().toISOString().split("T")[0],
          fullKoytaMen: "0", fullKoytaWomen: "0",
          halfKoytaMen: "0", halfKoytaWomen: "0",
          boysHelping: "0", girlsHelping: "0",
        },
  });

  const watchedVehicle = watch("vehicleType") as VehicleType;
  const watchedTons = watch("tonsPerVehicle");
  const ratePerTon = RATE_PER_TON_PAISE[watchedVehicle ?? "tractor"];

  const watchedFm = Number(watch("fullKoytaMen") || 0);
  const watchedFw = Number(watch("fullKoytaWomen") || 0);
  const watchedHm = Number(watch("halfKoytaMen") || 0);
  const watchedHw = Number(watch("halfKoytaWomen") || 0);
  const weightedCount = computeWeightedKoytaCount({
    fullKoytaMen: watchedFm, fullKoytaWomen: watchedFw,
    halfKoytaMen: watchedHm, halfKoytaWomen: watchedHw,
    boysHelping: 0, girlsHelping: 0,
  });

  const onSave = (data: OnboardingForm) => {
    const advPaise = Math.round(Number(data.advanceThisYear || 0) * 100);
    const outPaise = Math.round(Number(data.outstandingLastYear || 0) * 100);
    const fmN = Number(data.fullKoytaMen || 0);
    const fwN = Number(data.fullKoytaWomen || 0);
    const hmN = Number(data.halfKoytaMen || 0);
    const hwN = Number(data.halfKoytaWomen || 0);
    const toliComp = {
      fullKoytaMen: fmN, fullKoytaWomen: fwN,
      halfKoytaMen: hmN, halfKoytaWomen: hwN,
      boysHelping: Number(data.boysHelping || 0),
      girlsHelping: Number(data.girlsHelping || 0),
      weightedKoytaCount: computeWeightedKoytaCount({ fullKoytaMen: fmN, fullKoytaWomen: fwN, halfKoytaMen: hmN, halfKoytaWomen: hwN, boysHelping: 0, girlsHelping: 0 }),
    };
    setOnboarding({
      startDate: data.startDate,
      targetFactory: { name: data.factoryName, village: data.factoryVillage, taluka: data.facoryTaluka, district: data.factoryDistrict },
      mukadam: { name: data.mukadam, phoneE164: data.mukadamPhone },
      migrationDistanceDays: Number(data.migrationDays || 0),
      koytaType: data.koytaType,
      advanceTakenThisYearPaise: advPaise,
      outstandingLastYearPaise: outPaise,
      totalAdvancePaise: advPaise + outPaise,
      toli: toliComp,
      vehicle: { type: data.vehicleType, count: 1, tonsPerVehicle: Number(data.tonsPerVehicle || DEFAULT_TONS_PER_VEHICLE[data.vehicleType]) },
      ratesVersionId: RATES_VERSION_ID,
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  };

  if (!editing && ob) {
    return (
      <div className="screen" style={{ minHeight: "100dvh" }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t("tracker.toli.title")}</h2>
          <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>

        <div className="screen-body" style={{ paddingTop: 16, gap: 14 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Toli</p>
            {[
              { label: t("tracker.toli.full_m"), value: ob.toli.fullKoytaMen },
              { label: t("tracker.toli.full_w"), value: ob.toli.fullKoytaWomen },
              { label: t("tracker.toli.half_m"), value: ob.toli.halfKoytaMen },
              { label: t("tracker.toli.half_w"), value: ob.toli.halfKoytaWomen },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ borderTop: "0.5px solid var(--color-border)", paddingTop: 10 }}>
              <p style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>
                {t("tracker.toli.weighted", { count: ob.toli.weightedKoytaCount })}
              </p>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Vehicle</p>
            {[
              { label: t("tracker.vehicle.type"), value: ob.vehicle.type },
              { label: t("tracker.vehicle.tons"), value: ob.vehicle.tonsPerVehicle },
              { label: t("tracker.vehicle.rate", { rate: pToRupee(RATE_PER_TON_PAISE[ob.vehicle.type]) }), value: `₹${pToRupee(RATE_PER_TON_PAISE[ob.vehicle.type])}/ton` },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Advance</p>
            {[
              { label: "This Year", value: `₹${pToRupee(ob.advanceTakenThisYearPaise)}` },
              { label: "Outstanding Last Year", value: `₹${pToRupee(ob.outstandingLastYearPaise)}` },
              { label: "Total", value: `₹${pToRupee(ob.totalAdvancePaise)}` },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ minHeight: "100dvh" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{ob ? "Edit Toli" : t("tracker.onboarding.title")}</h2>
        {ob && (
          <button className="btn btn-ghost" style={{ padding: "6px", fontSize: 13 }} onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <form id="toli-form" onSubmit={handleSubmit(onSave)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Koyta type */}
          <div>
            <label className="input-label">{t("tracker.onboarding.koyta_type")}</label>
            <div className="toggle-group" style={{ marginTop: 8 }}>
              <label className="toggle-item">
                <input type="radio" value="full" {...register("koytaType")} style={{ display: "none" }} />
                {t("tracker.onboarding.full")}
              </label>
              <label className="toggle-item">
                <input type="radio" value="half" {...register("koytaType")} style={{ display: "none" }} />
                {t("tracker.onboarding.half")}
              </label>
            </div>
          </div>

          {/* Toli composition */}
          <div>
            <p className="input-label" style={{ marginBottom: 10 }}>{t("tracker.toli.title")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                ["fullKoytaMen", t("tracker.toli.full_m")],
                ["fullKoytaWomen", t("tracker.toli.full_w")],
                ["halfKoytaMen", t("tracker.toli.half_m")],
                ["halfKoytaWomen", t("tracker.toli.half_w")],
                ["boysHelping", t("tracker.toli.boys")],
                ["girlsHelping", t("tracker.toli.girls")],
              ] as [keyof OnboardingForm, string][]).map(([field, label]) => (
                <div key={field} className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">{label}</label>
                  <input className="input" type="number" inputMode="numeric" min="0" placeholder="0" {...register(field)} />
                </div>
              ))}
            </div>
            {weightedCount > 0 && (
              <p style={{ fontSize: 13, color: "var(--color-accent)", marginTop: 8, fontWeight: 600 }}>
                {t("tracker.toli.weighted", { count: weightedCount.toFixed(1) })}
              </p>
            )}
          </div>

          {/* Vehicle */}
          <div>
            <p className="input-label" style={{ marginBottom: 10 }}>{t("tracker.vehicle.title")}</p>
            <div className="input-group">
              <label className="input-label">{t("tracker.vehicle.type")}</label>
              <select className="select" {...register("vehicleType", { required: true })}>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ marginTop: 10 }}>
              <label className="input-label">{t("tracker.vehicle.tons")}</label>
              <input className="input" type="number" inputMode="numeric" min="0" step="0.5" {...register("tonsPerVehicle", { required: true })} />
            </div>
            {ratePerTon && (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6 }}>
                {t("tracker.vehicle.rate", { rate: pToRupee(ratePerTon) })}
              </p>
            )}
          </div>

          {/* Advance */}
          <div>
            <p className="input-label" style={{ marginBottom: 10 }}>Advance Details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="input-group">
                <label className="input-label">{t("tracker.onboarding.advance_this_year")}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 14 }}>₹</span>
                  <input className="input" style={{ paddingLeft: 24 }} type="number" inputMode="numeric" min="0" {...register("advanceThisYear")} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t("tracker.onboarding.outstanding_last_year")}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 14 }}>₹</span>
                  <input className="input" style={{ paddingLeft: 24 }} type="number" inputMode="numeric" min="0" {...register("outstandingLastYear")} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="screen-footer">
        <button type="submit" form="toli-form" className="btn btn-primary btn-full btn-lg">
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
