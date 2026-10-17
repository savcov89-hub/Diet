import { useEffect, useState } from "react";
import data from "./data/products.json";
import { generatePlan, getSolver, type PlanResult, type Product, type Profile, type Tier } from "./core";
import Questionnaire from "./ui/Questionnaire";
import Results from "./ui/Results";
import Evidence from "./ui/Evidence";
import { loadProfile, loadTheme, saveProfile, saveTheme } from "./ui/storage";

const products = (data as { products: Product[] }).products;
type View = "form" | "result" | "sources";

export default function App() {
  const [view, setView] = useState<View>("form");
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => loadTheme());

  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme); else document.documentElement.removeAttribute("data-theme");
    saveTheme(theme);
  }, [theme]);

  const run = async (p: Profile) => {
    setBusy(true); setError(null);
    try {
      const solve = await getSolver((f) => `${import.meta.env.BASE_URL}${f}`);
      // даём браузеру отрисовать состояние «считаем»
      await new Promise((r) => setTimeout(r, 30));
      const r = generatePlan(p, products, solve);
      setPlan(r); setView("result"); window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const toggleTheme = () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme ?? (prefersDark ? "dark" : "light");
    setTheme(current === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button className="flex items-center gap-2 font-extrabold tracking-tight" onClick={() => setView("form")} aria-label="На главную">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <span>Рацион<span className="text-accent">·</span>НСК</span>
          </button>
          <nav className="flex items-center gap-1">
            <button className="tabbtn" data-on={view === "form"} onClick={() => setView("form")}>Опросник</button>
            <button className="tabbtn" data-on={view === "result"} disabled={!plan} onClick={() => setView("result")}>Рацион</button>
            <button className="tabbtn" data-on={view === "sources"} onClick={() => setView("sources")}>Источники</button>
            <button className="tabbtn" onClick={toggleTheme} aria-label="Переключить тему" title="Тема">Тема</button>
          </nav>
        </div>
      </header>

      {error && <div className="mx-auto mt-4 max-w-3xl rounded-xl bg-danger-soft p-3 text-sm text-danger">Ошибка: {error}</div>}

      {view === "form" && <Questionnaire profile={profile} onChange={setProfile} onSubmit={() => run(profile)} busy={busy} products={products} />}
      {view === "result" && plan && <Results plan={plan} products={products} busy={busy} onBack={() => setView("form")} onRetier={(t: Tier) => { const p = { ...profile, tier: t }; setProfile(p); run(p); }} />}
      {view === "sources" && <Evidence />}

      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">
        <p>Приложение не является медицинской услугой и не заменяет консультацию врача или диетолога. При хронических заболеваниях, беременности и приёме лекарств согласуйте рацион с лечащим врачом.</p>
        <p className="mt-1">Нормы: МР 2.3.1.0253‑21, ВОЗ, KDIGO 2024, КР Минздрава (ХБП 2024, Ожирение 2024, СД2 2022), ADA 2026. Состав продуктов: USDA FoodData Central. Решатель: HiGHS (WebAssembly), все расчёты — в вашем браузере, данные никуда не отправляются.</p>
      </footer>
    </div>
  );
}
