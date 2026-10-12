import Link from "next/link"
import { Beaker, BookOpenText, ChevronRight, FlaskConical, Gauge, Microscope, Waves } from "lucide-react"
import { calculators } from "@/lib/calculators/registry"
const groups=[
 {title:"Estimators",sub:"Estimated values: eGFR, BSA, ideal weight, osmolality & more",icon:Gauge,href:"/estimators"},
 {title:"Dilution & solutions",sub:"C1V1=C2V2, molarity, normality and reagent preparation",icon:Beaker,href:"/calculators/lab-solutions"},
 {title:"Serial dilution",sub:"Concentration at each step of a dilution series",icon:Beaker,href:"/tools/serial-dilution"},
 {title:"Mass ↔ Volume",sub:"Density-based conversion by substance",icon:FlaskConical,href:"/tools/mass-volume"},
 {title:"Molar ↔ Mass concentration",sub:"mg/dL ↔ mmol/L by analyte",icon:FlaskConical,href:"/tools/molar-mass"},
 {title:"Spectrophotometry",sub:"Beer-Lambert, transmittance, regression and photometry",icon:Waves,category:"spectrophotometry"},
 {title:"Microbiology calculations",sub:"CFU, dilution factors and culture calculations",icon:Microscope,category:"microbiology"},
 {title:"McFarland standards",sub:"Turbidity standards and approximate cell density",icon:Microscope,href:"/tools/mcfarland"},
 {title:"Reference ranges",sub:"Hematology and chemistry quick references",icon:BookOpenText,href:"/references"},
]
export default function Tools(){return <div className="page"><div className="mb-4"><div className="text-xs font-bold text-slate-500">Bench and clinical utilities</div><h1 className="text-2xl font-black">Lab Tools</h1></div><div className="card overflow-hidden">{groups.map((g,i)=>{const count=g.category?calculators.filter(x=>x.category===g.category).length:undefined;const href=g.href??(g.category?`/calculators/${g.category}`:`/calculators/lab-solutions`);const Icon=g.icon;return <Link href={href} key={i} className="flex items-center gap-3 border-b p-3.5 last:border-0"><span className="iconbox bg-blue-50 text-blue-600"><Icon size={20}/></span><span className="flex-1"><span className="block text-sm font-extrabold">{g.title}</span><span className="block text-[11px] text-slate-500">{g.sub}{count?` · ${count} tools`:""}</span></span><ChevronRight size={18} className="text-slate-400"/></Link>})}</div><h2 className="section-title">Clinical utilities</h2><div className="card p-4 text-xs leading-5 text-slate-600"><FlaskConical size={20} className="mb-2 text-blue-600"/>All calculator definitions from the existing Clinexia clinical engine are available through the category catalog, with formulas, limitations and source references retained.</div></div>}
