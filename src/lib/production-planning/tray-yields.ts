/** Owner-supplied 12 October 2026 reference. Missing values are intentionally absent. */
import { isRiceBowl } from "./minimum-estimate";
export type YieldRegion = "penang" | "kl";
const normalize = (value:string) => value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const rows: Array<{names:string[];penang?:number;kl?:number}> = [
 {names:["Steamed White Sugar Sponge Kuih","White Sugar Sponge"],penang:16,kl:16},
 {names:["Traditional Malay Kuih"],penang:16},
 {names:["Steamed Pandan Kuih","Pandan"],penang:32,kl:32},
 {names:["Steamed Red Bean Kuih","Red Bean"],penang:32,kl:32},
 {names:["Steamed Black Sesame Layer Kuih","Black Sesame"],penang:32,kl:32},
 {names:["Steamed Almond Kuih","Almond"],penang:32,kl:32},
 {names:["Steamed Hawthorn Kuih","Hawthorn"],penang:32,kl:28},
 {names:["Steamed Osmanthus Kuih","Osmanthus"],penang:32,kl:32},
 {names:["Steamed Jujube Kuih (Red Date)","Red Date"],penang:32,kl:32},
 {names:["Steamed Water Chestnut Kuih","Water Chestnut"],penang:32,kl:32},
 {names:["Steamed Nutmeg Kuih","Nutmeg"],penang:32,kl:32},
 {names:["Chrysanthemum Kuih","Crysanthenum Kueh"],penang:32,kl:32},
 {names:["Roselle Kuih","Roselle Kueh"],penang:32,kl:32},
 {names:["Longan Sugar Cane Barley Kuih","Longan Sugar Cane Kueh"],penang:32,kl:32},
 {names:["Yam Kuih","Yam Cake"],penang:16,kl:16},
 {names:["Seafood Radish Kuih","Seafood Radish Cake"],penang:16,kl:16},
];
export function suppliedTrayYield(productName:string,region:YieldRegion):number|null {
 if(isRiceBowl(productName))return 1; // One bowl is one production unit, never a tray.
 return rows.find(row=>row.names.some(alias=>normalize(alias)===normalize(productName)))?.[region]??null;
}
