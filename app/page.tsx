import Link from "next/link"
import { ArrowLeftRight, Calculator, Clock3, FlaskConical, Gauge, Heart, HeartPulse, Settings } from "lucide-react"
import { calculators } from "@/lib/calculators/registry"
import { ToolRow } from "@/components/tool-row"

const quickIds=["bmi","red-cell-indices","ldl-friedewald","creatinine-clearance"]
const quick=quickIds.map(id=>calculators.find(x=>x.id===id)).filter(Boolean) as typeof calculators

export default function Home(){
 return <div className="page">
  <section className="mb-4"><div className="text-xs font-bold text-slate-500">Welcome.</div><h1 className="mt-1 text-[26px] font-black tracking-tight text-slate-900">Your Clinical Toolkit</h1><p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">Calculators, conversions, clinical references and laboratory tools. All stored locally on your device.</p></section>
  <div className="grid grid-cols-2 gap-3">
   <Link href="/calculators" className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white"><Calculator size={28}/><div className="mt-5 text-base font-black">Calculate</div><div className="text-[11px] text-blue-100">Open calculators</div></Link>
   <Link href="/convert" className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white"><ArrowLeftRight size={28}/><div className="mt-5 text-base font-black">Convert Units</div><div className="text-[11px] text-emerald-50">Open conversions</div></Link>
  </div>
  <h2 className="section-title">Quick Tools</h2>
  <div className="card overflow-hidden">{quick.map(t=><ToolRow key={t.id} tool={t}/>)}</div>
  <h2 className="section-title">Explore</h2>
  <div className="grid grid-cols-2 gap-3">
   {[{href:"/tools",title:"Lab Tools",sub:"Solutions, spectro & more",Icon:FlaskConical},{href:"/references",title:"References",sub:"Common lab ranges",Icon:HeartPulse},{href:"/history",title:"History",sub:"Recent calculations",Icon:Clock3},{href:"/favorites",title:"Favorites",sub:"Your pinned tools",Icon:Heart},{href:"/estimators",title:"Estimators",sub:"eGFR, BSA, IBW & more",Icon:Gauge},{href:"/settings",title:"Settings",sub:"Theme & preferences",Icon:Settings}].map(({href,title,sub,Icon})=><Link href={href} key={href} className="card p-4"><Icon size={22} className="text-blue-600"/><div className="mt-3 text-sm font-extrabold">{title}</div><div className="mt-1 text-[11px] text-slate-500">{sub}</div></Link>)}
  </div>
  <div className="mt-4 text-center text-[11px] text-slate-400">For clinical reference and educational use. Verify results against local protocols and the clinical context.</div>
 </div>
}
