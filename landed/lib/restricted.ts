// Goods we never fulfil or list, whatever the margin. Pure;
// tests/restricted.test.ts. Affiliate comparison still shows them (the buyer
// deals with the seller), but a restricted product can never pass the
// eligibility gate or be published to a channel.
//
// Reasons, in HK terms: e-cigarettes are banned from import (Cap. 371 as
// amended 2022); lithium batteries and aerosols are dangerous goods for air
// freight; medicines/supplements need registration; counterfeits are a
// Trade Descriptions Ordinance offence; blades and weapons need licences.

interface Category {
  reason: string;
  re: RegExp;
}

const CATEGORIES: Category[] = [
  { reason: "電子煙（香港禁止進口）E-cigarettes — banned import in HK", re: /(e-?cig|vape|vaping|pod\s*system|電子煙|电子烟|霧化煙|烟弹|煙彈)/i },
  { reason: "仿冒品 Counterfeit / replica", re: /(replica|counterfeit|\bfake\b|1:1\s*copy|高仿|a貨|a货|複刻|复刻版|精仿)/i },
  { reason: "藥物及保健品 Medicines & supplements", re: /(medicine|antibiotic|prescription|supplement|capsules?\b|melatonin|藥|药品|保健品|膠囊|胶囊|處方)/i },
  { reason: "鋰電池／危險品 Batteries & dangerous goods (air freight)", re: /(power\s*bank|lithium|li-?ion\s+batter|18650|充電寶|充电宝|移動電源|移动电源|鋰電|锂电)/i },
  { reason: "易燃／噴霧 Flammables & aerosols", re: /(aerosol|lighter\s+fluid|butane|perfume|香水|噴霧罐|打火機油|丁烷)/i },
  { reason: "刀具及武器 Blades & weapons", re: /(knife|dagger|machete|taser|stun\s*gun|pepper\s*spray|crossbow|刀具|匕首|電擊|电击|防狼噴霧|弩)/i },
  { reason: "食品 Food", re: /(\bfood\b|snack|infant\s+formula|奶粉|零食|食品)/i },
];

export function restrictedReason(title: string, category?: string | null): string | null {
  const hay = `${title} ${category ?? ""}`;
  for (const c of CATEGORIES) if (c.re.test(hay)) return c.reason;
  return null;
}
