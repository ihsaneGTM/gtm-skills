// THE MARKER HANDS a paper can be written in (2026-10-05: « une police un peu écrite à la main, comme
// dans notre référence »), all Google Fonts (OFL; Permanent Marker Apache 2.0). project.json
// `paperFont` picks one (Gochi Hand by default: the user's pick on the board of eight, 2026-10-05;
// Kalam is the closest to the reference's hand); fonts.mjs
// fetches it, book.mjs draws with it. `vs`: the variable instance; `fat`: a stroke that thickens a
// thin hand to the reference's marker; `track`: letter spacing (em) where two letters merge small
// (Gochi's « rn » read « m »: « Pipecorn » → « Pipecom » on a polaroid chin). Shared by both so the list cannot drift.
export const HANDS = {
  kalam:        { name: "Kalam Bold", files: ["Kalam-Bold.ttf", "Kalam-Bold.otf"], src: "ofl/kalam/Kalam-Bold.ttf", fat: 0.02 },
  caveat:       { name: "Caveat Bold", files: ["Caveat[wght].ttf"], src: "ofl/caveat/Caveat%5Bwght%5D.ttf", vs: '"wght" 700', fat: 0.025 },
  caveatbrush:  { name: "Caveat Brush", files: ["CaveatBrush-Regular.ttf"], src: "ofl/caveatbrush/CaveatBrush-Regular.ttf", fat: 0.01 },
  gochi:        { name: "Gochi Hand", files: ["GochiHand-Regular.ttf"], src: "ofl/gochihand/GochiHand-Regular.ttf", fat: 0.012, track: 0.035 },
  patrick:      { name: "Patrick Hand", files: ["PatrickHand-Regular.ttf"], src: "ofl/patrickhand/PatrickHand-Regular.ttf", fat: 0.035 },
  marker:       { name: "Permanent Marker", files: ["PermanentMarker-Regular.ttf"], src: "apache/permanentmarker/PermanentMarker-Regular.ttf", fat: 0 },
  shantell:     { name: "Shantell Sans", files: ["ShantellSans[BNCE,INFM,SPAC,wght].ttf"], src: "ofl/shantellsans/ShantellSans%5BBNCE%2CINFM%2CSPAC%2Cwght%5D.ttf", vs: '"wght" 800, "INFM" 100, "BNCE" 0, "SPAC" 0', fat: 0 },
  grandstander: { name: "Grandstander", files: ["Grandstander[wght].ttf"], src: "ofl/grandstander/Grandstander%5Bwght%5D.ttf", vs: '"wght" 800', fat: 0 },
};
export const DEFAULT_HAND = "gochi";
