import { useMemo, useState } from "react";
import { NUTRIENT_LABELS, SOURCE_MAP, compliance, dayNutrients, sumItems, toXE, weekAverage, type Compliance, type NutrientKey, type PlanResult, type Product, type Tier, type Warning } from "../core";
import { isFruit, isVegetable } from "../core/solver";
import { Badge, Bar, Card, Stat } from "./bits";
import { CATEGORY_LABEL, CATEGORY_ORDER, DAYS, TIER, fmtG, fmtInt, fmtRub } from "./labels";

interface Props { plan: PlanResult; products: Product[]; onBack: () => void; onRetier: (t: Tier) => void; busy: boolean }

type Tab = "week" | "shop" | "norms";

export default function Results({ plan, products, onBack, onRetier, busy }: Props) {
  const [tab, setTab] = useState<Tab>("week");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const avg = useMemo(() => weekAverage(plan.days, byId), [plan, byId]);
  const comp = useMemo(() => compliance(avg, plan.targets), [avg, plan]);
  const E = plan.energy.target;
  const pct = (g: number, kcalPerG: number) => Math.round(((g * kcalPerG) / avg.kcal) * 100);
  const lowCount = comp.filter((c) => c.status === "low").length;

  if (plan.solverStatus !== "Optimal") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <h1 className="text-xl font-bold text-danger">Не удалось собрать рацион</h1>
          <p className="mt-2 text-sm text-muted">Статус решателя: {plan.solverStatus}. Обычно это слишком жёсткое сочетание исключений (например, веган + без сои + без орехов + без глютена). Снимите часть ограничений и попробуйте снова.</p>
          <button className="btn btn-primary mt-4" onClick={onBack}>К опроснику</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Рацион на неделю · {TIER[plan.profile.tier].label}</h1>
          <p className="mt-1 text-sm text-muted">
            {plan.profile.sex === "female" ? "Женщина" : "Мужчина"}, {plan.profile.age} лет, {plan.profile.weightKg} кг · ИМТ {plan.energy.bmi} ({plan.energy.bmiCategory}) · расход {fmtInt(plan.energy.tdee)} ккал
            {plan.energy.deficit > 0 ? ` · дефицит ${plan.energy.deficit} ккал` : plan.energy.deficit < 0 ? ` · профицит ${-plan.energy.deficit} ккал` : ""}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button className="btn btn-ghost" onClick={onBack}>Изменить опросник</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Печать</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Калорийность" value={`${fmtInt(avg.kcal)} ккал`} sub={`цель ${fmtInt(E)} · среднее за день`} />
        <Stat label="Б / Ж / У" value={<span className="text-xl">{fmtInt(avg.protein)} / {fmtInt(avg.fat)} / {fmtInt(avg.carbs)} г</span>} sub={`${pct(avg.protein, 4)} % / ${pct(avg.fat, 9)} % / ${pct(avg.carbs, 4)} % энергии · белок ${(avg.protein / plan.profile.weightKg).toFixed(2)} г/кг`} />
        <Stat label="Стоимость" value={fmtRub(plan.costWeek)} sub={`в неделю · ${fmtRub(plan.costWeek / 7)} в день`} />
        <Stat label="Нормы" value={lowCount === 0 ? "выполнены" : `${lowCount} недобор${lowCount === 1 ? "" : lowCount < 5 ? "а" : "ов"}`} sub={lowCount === 0 ? "все минимумы и пределы в среднем за неделю" : "см. вкладку «Нормы»"} />
      </div>

      {plan.warnings.length > 0 && (
        <div className="mt-4 grid gap-2">
          {plan.warnings.map((w, i) => <WarningRow key={i} w={w} />)}
        </div>
      )}
      {plan.energy.notes.length > 0 && (
        <p className="mt-3 text-xs text-muted">{plan.energy.notes.join(" ")}</p>
      )}

      <nav className="no-print mt-6 inline-flex gap-1 rounded-2xl bg-surface-2 p-1" aria-label="Разделы результата">
        {([["week", "Меню"], ["shop", "Список покупок"], ["norms", "Нормы"]] as Array<[Tab, string]>).map(([t, l]) => (
          <button key={t} className="tabbtn" data-on={tab === t} onClick={() => setTab(t)}>{l}</button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "week" && <WeekView plan={plan} byId={byId} />}
        {tab === "shop" && <ShopView plan={plan} byId={byId} onRetier={onRetier} busy={busy} />}
        {tab === "norms" && <NormsView plan={plan} comp={comp} avg={avg} byId={byId} />}
      </div>
    </div>
  );
}

function WarningRow({ w }: { w: Warning }) {
  const tone = w.level === "danger" ? "bg-danger-soft text-danger" : w.level === "warn" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
  return (
    <div className={`rounded-xl p-3 text-sm ${tone}`}>
      <span className="text-ink">{w.text}</span>
      {w.sources.length > 0 && (
        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
          {w.sources.map((s) => SOURCE_MAP[s] && (
            <a key={s} href={SOURCE_MAP[s].url} target="_blank" rel="noreferrer" className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted hover:text-ink" title={SOURCE_MAP[s].title}>{SOURCE_MAP[s].org} {SOURCE_MAP[s].year}</a>
          ))}
        </span>
      )}
    </div>
  );
}

function WeekView({ plan, byId }: { plan: PlanResult; byId: Map<string, Product> }) {
  const [day, setDay] = useState(0);
  const [all, setAll] = useState(false);
  const E = plan.energy.target;
  const diabetic = plan.profile.diabetes !== "none";
  const days = all ? plan.days : [plan.days[day]];
  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-2xl bg-surface-2 p-1">
          {DAYS.map((d, i) => <button key={d} className="tabbtn" data-on={!all && day === i} onClick={() => { setAll(false); setDay(i); }}>{d}</button>)}
        </div>
        <button className="tabbtn" data-on={all} onClick={() => setAll(!all)}>Вся неделя</button>
      </div>
      <div className="grid gap-4">
        {days.map((d) => {
          const n = dayNutrients(d, byId);
          return (
            <Card key={d.index} className="print-block">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"][d.index]}</h2>
                <div className="text-sm text-muted mono">{fmtInt(n.kcal)} ккал · Б {fmtInt(n.protein)} · Ж {fmtInt(n.fat)} · У {fmtInt(n.carbs)} г{diabetic ? ` · ${toXE(n.carbs)} ХЕ` : ""}</div>
              </div>
              <Bar pct={(n.kcal / E) * 100} status={Math.abs(n.kcal - E) / E < 0.1 ? "ok" : "low"} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {d.meals.map((m, i) => {
                  const mn = sumItems(m.items, byId);
                  return (
                    <div key={i} className="rounded-xl border border-line p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold">{m.title}</h3>
                        <span className="mono text-xs text-muted">{fmtInt(mn.kcal)} ккал{diabetic ? ` · ${toXE(mn.carbs)} ХЕ` : ""}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {m.items.map((it) => {
                          const p = byId.get(it.productId)!;
                          return (
                            <li key={it.productId} className="flex justify-between gap-3">
                              <span>{p.name}</span>
                              <span className="mono whitespace-nowrap text-muted">{fmtG(it.grams)} · {fmtInt((p.per100g.kcal * it.grams) / 100)} ккал</span>
                            </li>
                          );
                        })}
                        {m.items.length === 0 && <li className="text-muted">— пусто (мало приёмов для такого объёма)</li>}
                      </ul>
                      <div className="mt-2 text-xs text-muted mono">Б {fmtInt(mn.protein)} · Ж {fmtInt(mn.fat)} · У {fmtInt(mn.carbs)} г</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Граммовки указаны для сырых продуктов (крупы — сухие). Нормы оцениваются в среднем за неделю: отдельный день может отличаться на ±10 %.</p>
    </div>
  );
}

function ShopView({ plan, byId, onRetier, busy }: { plan: PlanResult; byId: Map<string, Product>; onRetier: (t: Tier) => void; busy: boolean }) {
  const tier = plan.profile.tier;
  const groups = useMemo(() => {
    const m = new Map<string, Array<{ p: Product; g: number; sum: number }>>();
    for (const [id, g] of Object.entries(plan.basket)) {
      const p = byId.get(id); if (!p) continue;
      const price = p.prices[tier] ?? 0;
      const row = { p, g, sum: (price * g) / 1000 };
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(row);
    }
    for (const list of m.values()) list.sort((a, b) => b.sum - a.sum);
    return CATEGORY_ORDER.filter((c) => m.has(c)).map((c) => ({ cat: c, rows: m.get(c)!, total: m.get(c)!.reduce((a, r) => a + r.sum, 0) }));
  }, [plan, byId, tier]);
  const est = Object.keys(plan.basket).filter((id) => byId.get(id)?.price_estimated).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["econom", "business", "premium"] as Tier[]).map((t) => {
          const c = plan.costByTier[t];
          return (
            <div key={t} className={`card p-4 ${t === tier ? "ring-2 ring-accent" : ""}`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{TIER[t].label}</div>
              <div className="mt-1 text-xl font-extrabold mono">{c == null ? "—" : fmtRub(c)}<span className="text-sm font-medium text-muted"> / нед</span></div>
              <div className="text-xs text-muted">{c == null ? "часть продуктов этой корзины не продаётся в этом уровне" : t === tier ? "эта корзина по ценам уровня" : "та же корзина по ценам уровня"}</div>
              {t !== tier && <button className="btn btn-ghost mt-2 w-full text-xs no-print" disabled={busy} onClick={() => onRetier(t)}>Пересобрать для «{TIER[t].label}»</button>}
            </div>
          );
        })}
      </div>
      {groups.map((g) => (
        <Card key={g.cat} className="print-block">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-bold">{CATEGORY_LABEL[g.cat] ?? g.cat}</h3>
            <span className="mono text-sm text-muted">{fmtRub(g.total)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {g.rows.map(({ p, g: grams, sum }) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-1.5 pr-2">
                    <input type="checkbox" className="mr-2 align-middle no-print" aria-label={`куплено: ${p.name}`} />
                    {p.name}
                    {p.note && <span className="ml-1 text-xs text-muted" title={p.note}>ⓘ</span>}
                  </td>
                  <td className="mono whitespace-nowrap py-1.5 text-right">{fmtG(grams)}</td>
                  <td className="mono whitespace-nowrap py-1.5 text-right text-muted">{p.price_estimated ? "≈" : ""}{fmtInt(p.prices[tier] ?? 0)} ₽/кг</td>
                  <td className="mono whitespace-nowrap py-1.5 text-right font-semibold">{fmtRub(sum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      <div className="card flex items-baseline justify-between p-4">
        <span className="font-bold">Итого на неделю</span>
        <span className="mono text-xl font-extrabold">{fmtRub(plan.costWeek)}</span>
      </div>
      <p className="text-xs text-muted">Цены ориентировочные для Новосибирска, октябрь 2026 (Новосибирскстат, замер НГС по Центральному рынку и «Магниту»). «≈» — экспертная оценка, таких позиций {est} из {Object.keys(plan.basket).length}. Цены правятся в файле data/etl/catalog.py.</p>
    </div>
  );
}

const GROUPS: Array<{ title: string; keys: NutrientKey[] }> = [
  { title: "Энергия и макронутриенты", keys: ["kcal", "protein", "fat", "carbs", "fiber", "sat_fat", "trans_fat", "cholesterol", "sodium"] },
  { title: "Витамины", keys: ["vit_a", "vit_d", "vit_e", "vit_k", "vit_c", "vit_b1", "vit_b2", "niacin", "vit_b5", "vit_b6", "folate", "vit_b12", "choline"] },
  { title: "Минералы", keys: ["calcium", "phosphorus", "magnesium", "potassium", "iron", "zinc", "iodine", "copper", "manganese", "selenium"] },
];

function NormsView({ plan, comp, avg, byId }: { plan: PlanResult; comp: Compliance[]; avg: ReturnType<typeof weekAverage>; byId: Map<string, Product> }) {
  const E = plan.energy.target;
  const vegFruit = Object.entries(plan.basket).reduce((a, [id, g]) => { const p = byId.get(id); return p && (isVegetable(p) || isFruit(p)) ? a + g : a; }, 0) / 7;
  const addedSugar = Object.entries(plan.basket).reduce((a, [id, g]) => { const p = byId.get(id); return p && p.tags.includes("added_sugar") ? a + (p.per100g.sugars * g) / 100 : a; }, 0) / 7;
  const fmt = (v: number, k: NutrientKey) => (v >= 100 ? fmtInt(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",") + " " + NUTRIENT_LABELS[k].unit;
  const GROUP_LABEL: Record<string, string> = { veg_fruit: "овощи и фрукты", veg: "овощи", fruit: "фрукты и ягоды", fish: "рыба", legume: "бобовые", dairy: "молочные", animal_protein: "мясо/птица", veg_variety_cabbage: "капустные", veg_colored: "овощи кроме корнеплодов" };
  const low = plan.shortfalls.filter((s) => s.fraction >= 0.1);
  return (
    <div className="grid gap-4">
      {low.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-3 text-sm">
          <b>Что еда не закрывает полностью:</b>{" "}
          {low.map((s) => `${NUTRIENT_LABELS[s.key as NutrientKey]?.label ?? GROUP_LABEL[s.key] ?? s.key} (−${Math.round(s.fraction * 100)} %)`).join(", ")}.
          {low.some((s) => s.key === "vit_d") && " Витамин D из пищи в Сибири обычно недобирается: РАЭ рекомендует профилактические 800–2000 МЕ/сут — обсудите с врачом."}
          {low.some((s) => s.key === "vit_b12") && " Витамин B12 без продуктов животного происхождения требует добавки."}
        </div>
      )}
      <Card>
        <h3 className="mb-3 font-bold">Структура рациона</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <KV k="Овощи и фрукты" v={`${fmtInt(vegFruit)} г/сут`} ok={vegFruit >= 400 * 0.97} hint="ВОЗ: ≥400 г" />
          <KV k="Добавленные сахара" v={`${((addedSugar * 4) / E * 100).toFixed(1).replace(".", ",")} % энергии`} ok={(addedSugar * 4) / E <= 0.1} hint="ВОЗ: <10 %, лучше <5 %" />
          <KV k="Белок" v={`${(avg.protein / plan.profile.weightKg).toFixed(2).replace(".", ",")} г/кг`} ok hint={plan.targets.protein?.note ?? ""} />
          <KV k="Жиры" v={`${Math.round((avg.fat * 9) / avg.kcal * 100)} % энергии`} ok={(avg.fat * 9) / avg.kcal <= 0.36} hint="ВОЗ/МР: ≤30 % (≤35 % при СД, ХБП)" />
          <KV k="Насыщенные жиры" v={`${Math.round((avg.sat_fat * 9) / avg.kcal * 100)} % энергии`} ok={(avg.sat_fat * 9) / avg.kcal <= 0.103} hint="ВОЗ: ≤10 %" />
          <KV k="Соль (по натрию)" v={`${(avg.sodium / 400).toFixed(1).replace(".", ",")} г/сут`} ok={avg.sodium <= 2060} hint="ВОЗ: <5 г" />
        </div>
      </Card>
      {GROUPS.map((g) => (
        <Card key={g.title} className="print-block">
          <h3 className="mb-3 font-bold">{g.title}</h3>
          <div className="grid gap-3">
            {g.keys.map((k) => {
              const c = comp.find((x) => x.key === k);
              if (!c) return null;
              const t = plan.targets[k]!;
              const tone = c.status === "ok" ? "ok" : c.status === "low" ? "warn" : "danger";
              return (
                <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[180px_1fr_auto_auto]">
                  <div className="font-medium">{NUTRIENT_LABELS[k].label}</div>
                  <div className="col-span-2 sm:col-span-1 order-3 sm:order-none"><Bar pct={c.pct} status={c.status} /></div>
                  <div className="mono text-sm whitespace-nowrap text-right">{fmt(c.value, k)}</div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="mono hidden text-xs text-muted sm:inline whitespace-nowrap">
                      {t.min != null ? `≥${fmt(t.min, k)}` : ""}{t.min != null && t.max != null ? " · " : ""}{t.max != null ? `≤${fmt(t.max, k)}` : ""}
                    </span>
                    <Badge tone={tone}>{c.status === "ok" ? "норма" : c.status === "low" ? `${Math.round(c.pct)} %` : "выше предела"}</Badge>
                  </div>
                  <details className="col-span-full text-xs text-muted">
                    <summary className="cursor-pointer select-none">источник{t.note ? ` · ${t.note}` : ""}</summary>
                    <ul className="mt-1 list-disc pl-5">
                      {t.sources.map((s) => SOURCE_MAP[s] && <li key={s}><a className="hover:underline" href={SOURCE_MAP[s].url} target="_blank" rel="noreferrer">{SOURCE_MAP[s].org}, {SOURCE_MAP[s].year}: {SOURCE_MAP[s].title}</a></li>)}
                    </ul>
                  </details>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <p className="text-xs text-muted">Состав продуктов: USDA FoodData Central SR Legacy (public domain); йод и облепиха — Скурихин, Тутельян 2002. В USDA почти нет данных по витамину D для многих продуктов, поэтому его «недобор» может быть завышен.</p>
    </div>
  );
}

function KV({ k, v, ok, hint }: { k: string; v: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
      <div>
        <div className="font-medium">{k}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="mono text-sm">{v}</span>
        <Badge tone={ok ? "ok" : "warn"}>{ok ? "✓" : "!"}</Badge>
      </div>
    </div>
  );
}
