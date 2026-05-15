import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { pToRupee } from "@kothi/shared/types/budget";
import { computeWages, RATE_PER_TON_PAISE, DEFAULT_TONS_PER_VEHICLE, RATES_VERSION_ID } from "@kothi/shared/types/tracker";
import type { DayType, VehicleType } from "@kothi/shared/types/tracker";
import { useTrackerStore } from "./store";

interface EntryForm {
  occurredOn: string;
  dayType: DayType;
  factoryName: string;
  village: string;
  district: string;
  startTime: string;
  endTime: string;
  vehiclesFilled: string;
}

const DAY_TYPES: DayType[] = ["working_day", "in_transit", "phad_reached", "at_phad_no_work", "journey_started"];

export function TrackerLedger() {
  const { t } = useTranslation();
  const { state, addRecord } = useTrackerStore();
  const [showAdd, setShowAdd] = useState(false);

  const ob = state.onboarding;
  const vehicleType: VehicleType = ob?.vehicle.type ?? "tractor";
  const tonsPerVehicle = ob?.vehicle.tonsPerVehicle ?? DEFAULT_TONS_PER_VEHICLE[vehicleType];
  const toli = ob?.toli;

  const { register, handleSubmit, watch, reset, formState: { isValid } } = useForm<EntryForm>({
    mode: "onChange",
    defaultValues: {
      occurredOn: new Date().toISOString().split("T")[0],
      dayType: "working_day",
    },
  });

  const watchedDayType = watch("dayType");
  const watchedVehicles = watch("vehiclesFilled");
  const isWorkingDay = watchedDayType === "working_day";

  const estimatedWages = isWorkingDay && toli && watchedVehicles
    ? computeWages(Number(watchedVehicles), tonsPerVehicle, vehicleType, toli)
    : null;

  const onAdd = (data: EntryForm) => {
    const wages = isWorkingDay && toli
      ? computeWages(Number(data.vehiclesFilled || 0), tonsPerVehicle, vehicleType, toli)
      : { toliPaise: 0, koytaPaise: 0 };

    addRecord({
      occurredOn: data.occurredOn,
      dayType: data.dayType,
      factoryName: data.factoryName,
      village: data.village,
      district: data.district,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      vehiclesFilled: data.vehiclesFilled ? Number(data.vehiclesFilled) : undefined,
      ratesVersionId: RATES_VERSION_ID,
      wagesEarnedToliPaise: wages.toliPaise,
      wagesEarnedKoytaPaise: wages.koytaPaise,
    });
    events.track("daily_record_logged", { dayType: data.dayType });
    reset({ occurredOn: new Date().toISOString().split("T")[0], dayType: "working_day" });
    setShowAdd(false);
  };

  return (
    <div className="screen" style={{ minHeight: "100dvh", position: "relative" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Daily Ledger</h2>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {state.records.length} entries
        </span>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {state.records.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 0" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>No daily entries yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {state.records.map((r, i) => (
              <div key={i} className="ledger-row">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{r.occurredOn}</span>
                      <span style={{
                        fontSize: 11, padding: "1px 7px", borderRadius: 10,
                        background: r.dayType === "working_day" ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "var(--color-border)",
                        color: r.dayType === "working_day" ? "var(--color-accent)" : "var(--color-text-muted)",
                        fontWeight: 600,
                      }}>
                        {t(`tracker.entry.day_types.${r.dayType}`, r.dayType.replace(/_/g, " "))}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      {[r.factoryName, r.village, r.district].filter(Boolean).join(" · ")}
                    </p>
                    {r.vehiclesFilled && (
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                        {r.vehiclesFilled} vehicles · {RATE_PER_TON_PAISE[vehicleType] / 100}₹/ton
                      </p>
                    )}
                  </div>
                  {r.wagesEarnedToliPaise > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent)" }}>
                        ₹{pToRupee(r.wagesEarnedToliPaise)}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>toli wages</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add daily entry">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Bottom sheet */}
      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div style={{
            width: "100%", background: "var(--color-bg)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            padding: "24px 20px 36px", display: "flex", flexDirection: "column", gap: 16,
            maxHeight: "90dvh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{t("tracker.entry.title")}</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onAdd)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="input-group">
                <label className="input-label">{t("tracker.entry.date")}</label>
                <input className="input" type="date" {...register("occurredOn", { required: true })} />
              </div>

              <div className="input-group">
                <label className="input-label">{t("tracker.entry.day_status")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DAY_TYPES.map((dt) => (
                    <label key={dt} style={{ cursor: "pointer" }}>
                      <input type="radio" value={dt} {...register("dayType", { required: true })} style={{ display: "none" }} />
                      <span style={{
                        display: "block", padding: "6px 12px", borderRadius: 20, fontSize: 13,
                        border: "0.5px solid var(--color-border)", background: "var(--color-surface)",
                      }}>
                        {t(`tracker.entry.day_types.${dt}`, dt.replace(/_/g, " "))}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t("tracker.entry.factory")}</label>
                <input className="input" placeholder="Factory name · Village" {...register("factoryName")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Village</label>
                  <input className="input" {...register("village")} />
                </div>
                <div className="input-group">
                  <label className="input-label">District</label>
                  <input className="input" {...register("district")} />
                </div>
              </div>

              {isWorkingDay && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="input-group">
                      <label className="input-label">{t("tracker.entry.start_time")}</label>
                      <input className="input" type="time" {...register("startTime")} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">{t("tracker.entry.end_time")}</label>
                      <input className="input" type="time" {...register("endTime")} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">{t("tracker.entry.vehicles_filled")}</label>
                    <input className="input" type="number" inputMode="numeric" min="0" placeholder="0" {...register("vehiclesFilled")} />
                  </div>

                  {estimatedWages && estimatedWages.toliPaise > 0 && (
                    <div className="banner info" style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 13 }}>
                        {t("tracker.entry.estimated_wages", { amount: pToRupee(estimatedWages.toliPaise) })}
                      </span>
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg">
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
