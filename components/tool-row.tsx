import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { CalculatorDefinition } from "@/lib/calculators/types"
import { categoryMeta,toneStyle } from "@/lib/ui-meta"
import { AccessBadge } from "@/components/access-badge"

export function ToolRow({tool}:{tool:CalculatorDefinition}){
 const meta=categoryMeta[tool.category],tone=toneStyle[meta.tone]
 return <Link href={`/calculators/${tool.category}/${tool.id}`} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3.5 last:border-0">
  <span className="iconbox text-lg font-black" style={{background:tone.bg,color:tone.fg}}>{meta.emoji}</span>
  <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-800">{tool.shortName??tool.name}<AccessBadge id={tool.id} category={tool.category}/></span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{tool.description}</span></span>
  <ChevronRight size={18} className="text-slate-400"/>
 </Link>
}
