import type { Product, Profile, Warning } from "./types";

export interface Restrictions {
  /** продукты полностью исключены */
  excluded: Set<string>;
  /** переопределённый недельный максимум, г */
  caps: Record<string, number>;
  /** недельный максимум для субпродуктов (группа) */
  offalCapWeek: number;
  warnings: Warning[];
}

const EXCLUSION_TAGS: Record<string, string[]> = {
  lactose: ["lactose"],
  dairy: ["dairy"],
  gluten: ["gluten"],
  egg: ["egg"],
  fish: ["fish"],
  seafood: ["seafood"],
  nuts: ["nuts"],
  peanut: ["peanut"],
  soy: ["soy"],
  pork: ["pork"],
  red_meat: ["red_meat"],
  meat: ["meat"],
  offal: ["offal"],
  vegan: ["meat", "fish", "seafood", "dairy", "egg"],
  fasting: ["meat", "dairy", "egg"],
};

export function applyRules(p: Profile, products: Product[]): Restrictions {
  const excluded = new Set<string>();
  const caps: Record<string, number> = {};
  const warnings: Warning[] = [];
  let offalCapWeek = 250;

  const tags = new Set<string>();
  for (const e of p.exclusions) for (const t of EXCLUSION_TAGS[e] ?? []) tags.add(t);
  if (p.pregnancy !== "none") tags.add("pregnancy_avoid");

  for (const pr of products) {
    if (pr.prices[p.tier] == null) { excluded.add(pr.id); continue; }
    if (pr.season === "summer" && p.season === "winter") {
      // зимой сезонные овощи/ягоды остаются (тепличные/замороженные), но реже; строго летние — исключаем
      const cap = Math.round((pr.max_week_g ?? 500) * 0.4);
      if (pr.tags.includes("summer_only") || cap < pr.min_week_g) excluded.add(pr.id);
      else caps[pr.id] = cap;
    }
    if (pr.season === "winter" && p.season === "summer") {
      const cap = Math.round((pr.max_week_g ?? 500) * 0.5);
      if (cap < pr.min_week_g) excluded.add(pr.id); else caps[pr.id] = cap;
    }
    if (pr.tags.some((t) => tags.has(t))) excluded.add(pr.id);
    if (p.dislikes.includes(pr.id)) excluded.add(pr.id);

    if (p.diabetes !== "none") {
      if (pr.tags.includes("added_sugar")) excluded.add(pr.id);
      else if (pr.tags.includes("high_gi")) caps[pr.id] = Math.min(caps[pr.id] ?? Infinity, Math.round((pr.max_week_g ?? 500) * 0.4));
    }
    if (p.goal === "lose" && pr.tags.includes("added_sugar")) caps[pr.id] = Math.min(caps[pr.id] ?? Infinity, 70);
    if (p.ckd !== "none" && pr.id === "salt_iodized") caps[pr.id] = 20;
  }

  if (p.exclusions.includes("lactose")) {
    warnings.push({ level: "info", text: "Непереносимость лактозы: исключены молоко, кефир, йогурт, творог, сметана. Твёрдые сыры и сливочное масло почти не содержат лактозы и оставлены; большинство людей переносят до 12 г лактозы за приём.", sources: ["EFSA_LACTOSE_2010"] });
  }
  if (p.exclusions.includes("gluten")) {
    warnings.push({ level: "info", text: "Безглютеновый режим: исключены пшеница, рожь, ячмень, овёс (овёс — из-за риска контаминации). Если целиакия подтверждена, выбирайте продукты с маркировкой «без глютена».", sources: [] });
  }
  if (p.exclusions.includes("vegan")) {
    warnings.push({ level: "warn", text: "Веганский рацион: витамин B12 из еды не поступает — нужна добавка; йод закрывается ламинарией и йодированной солью; следите за железом, цинком, кальцием, витамином D и омега‑3 (лён, грецкий орех).", sources: ["MR2021"] });
  }

  if (p.pregnancy !== "none") {
    offalCapWeek = 100;
    caps["tuna_canned"] = Math.min(caps["tuna_canned"] ?? Infinity, 140);
    warnings.push({ level: "warn", text: "Беременность: исключены мягкие рассольные сыры, солёная сельдь, икра (листериоз, соль). Печень ограничена 100 г/нед из-за витамина A. Снижение веса не планируется. Обсудите с врачом добавки: фолиевая кислота 400 мкг и железо 30–60 мг ежедневно, йод.", sources: ["WHO_ANC_2016", "MR2021", "EFSA_UL"] });
    if (p.goal === "lose") warnings.push({ level: "danger", text: "Цель «снижение веса» при беременности не применяется: рацион рассчитан на поддержание с надбавкой по триместру.", sources: ["MR2021"] });
  }
  if (p.lactation !== "none") {
    warnings.push({ level: "info", text: "Грудное вскармливание: нормы увеличены (+500/+450 ккал, +40/+30 г белка, йод 290 мкг, кальций 1400 мг). При цели снизить вес дефицит ограничен 500 ккал и не ниже 1800 ккал/сут.", sources: ["MR2021", "LOVELADY_2000"] });
  }

  if (p.ckd !== "none") {
    const stage: Record<string, string> = { s1_2: "С1–С2", s3a: "С3а", s3b: "С3б", s4_5: "С4–С5", dialysis: "С5Д (гемодиализ)" };
    warnings.push({ level: "danger", text: `ХБП ${stage[p.ckd]}: рацион рассчитан по белку, калию, фосфору и натрию согласно КР «ХБП» 2024 и KDIGO 2024, но при ХБП питание назначает нефролог или диетолог по анализам (калий, фосфор, альбумин). Используйте план как заготовку для обсуждения с врачом.`, sources: ["RU_CKD_2024", "KDIGO_2024", "KDOQI_2020"] });
    if (p.ckd === "s3b" || p.ckd === "s4_5") warnings.push({ level: "warn", text: "Белок ограничен до 0,6–0,8 г/кг/сут. Очень низкобелковые диеты (0,3–0,4 г/кг с кетоаналогами) возможны только под наблюдением врача и в приложении не используются.", sources: ["RU_CKD_2024", "KDIGO_2024"] });
    if (p.ckd === "dialysis") warnings.push({ level: "warn", text: "Гемодиализ: белок повышен до 1,0–1,2 г/кг/сут, фосфор <800 мг, калий 2–3 г. Ограничение жидкости в приложении не учитывается.", sources: ["KDOQI_2020"] });
    if (p.goal === "lose") warnings.push({ level: "warn", text: "При ХБП дефицит ограничен 500 ккал и энергия не ниже 30 ккал/кг. Снижение веса при ХБП — только по согласованию с нефрологом.", sources: ["RU_CKD_2024"] });
  }

  if (p.diabetes === "t1") {
    warnings.push({ level: "warn", text: "СД 1 типа: углеводы распределены равномерно по приёмам, для каждого приёма показаны ХЕ (1 ХЕ = 10 г углеводов). Дозу инсулина на ХЕ определяет эндокринолог. Исключены сахар, мёд, варенье, шоколад; продукты с высоким ГИ ограничены.", sources: ["RU_ALG_2025", "ADA_2026"] });
  }
  if (p.diabetes === "t2") {
    warnings.push({ level: "warn", text: "СД 2 типа: при избыточной массе цель — снижение на 5–10 % (ADA: ≥5–7 %); клетчатка ≥14 г/1000 ккал; добавленные сахара ≤5 % энергии; углеводы из овощей, бобовых, цельных злаков и молочных продуктов; голодание противопоказано.", sources: ["RU_ALG_2025", "RU_T2D_2022", "ADA_2026"] });
  }
  if (p.diabetes !== "none" && p.pregnancy !== "none") {
    warnings.push({ level: "danger", text: "Диабет при беременности ведётся эндокринологом с индивидуальными целями гликемии; этот план — только ориентир по продуктам.", sources: ["RU_ALG_2025"] });
  }

  const bmiV = p.weightKg / Math.pow(p.heightCm / 100, 2);
  if (p.goal === "lose" && bmiV < 18.5) warnings.push({ level: "danger", text: "ИМТ ниже 18,5: снижение веса не рекомендуется. Рацион рассчитан на поддержание.", sources: ["RU_OBESITY_2024"] });
  if (p.goal === "lose" && bmiV >= 25 && p.pregnancy === "none") {
    warnings.push({ level: "info", text: "Снижение веса: дефицит 500–700 ккал/сут, белок 1,2–1,6 г/кг для сохранения мышц, минимально обработанные продукты. Интервальное голодание не даёт преимуществ перед обычным дефицитом, выбирайте удобное число приёмов пищи.", sources: ["RU_OBESITY_2024", "LEIDY_2015", "NATMED_UPF_2025", "BMJ_IF_2025"] });
  }
  if (p.age < 18) warnings.push({ level: "danger", text: "Нормы в приложении рассчитаны для взрослых (18+). Для детей и подростков используйте табл. 21 МР 2.3.1.0253-21 и консультацию педиатра.", sources: ["MR2021"] });

  return { excluded, caps, offalCapWeek, warnings };
}
