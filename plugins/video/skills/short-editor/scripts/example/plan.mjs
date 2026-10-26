import { juggle, crowd, lockup } from "../beats.mjs";
export async function load() {}
export const BEATS = [
  juggle({
    from: 7.70, to: 15.05, panicFrom: 13.7, panicTo: 14.9,
    items: [
      { brand: "youtube", t: 8.66 }, { brand: "tiktok", t: 9.68 },
      { brand: "instagram", t: 10.52 }, { brand: "seo", t: 11.05 },
      { brand: "signups", t: 12.95 },
    ],
  }),
  crowd({ from: 22.15, to: 25.30, n: 10, cols: 5, appearFrom: 22.30, strikeAt: 23.82, label: "a team of {n}" }),
  lockup({ from: 28.30, to: 34.70, title: "GTM OS", at: 28.40,
           sub: "the operating system for all your channels", subAt: 32.30 }),
];
