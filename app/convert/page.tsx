"use client"
import { ArrowLeftRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { conversionCategories } from "@/lib/conversions/registry"
import { convert } from "@/lib/conversions/engine"
import { addHistory, getSettings } from "@/lib/client-store"
import { trackCalculation } from "@/lib/analytics/track"

function Converter(){
 const params=useSearchParams(); const initial=params.get("category")
 const [categoryId,setCategoryId]=useState(initial&&conversionCategories.some(x=>x.id===initial)?initial:conversionCategories[0].id); const cat=useMemo(()=>conversionCategories.find(x=>x.id===categoryId)!,[categoryId]);
 const [from,setFrom]=useState(cat.units[0].id),[to,setTo]=useState(cat.units[1]?.id??cat.units[0].id),[value,setValue]=useState(""),[result,setResult]=useState<number|null>(null)
 useEffect(()=>{setFrom(cat.units[0].id);setTo(cat.units[1]?.id??cat.units[0].id);setResult(null)},[cat])
 function run(){const n=Number(value);if(!Number.isFinite(n))return;const r=convert(cat,n,from,to);setResult(r);void trackCalculation({calculatorId:`conversion:${cat.id}`,calculatorName:`${cat.name} Conversion`,category:"conversions"});const a=cat.units.find(x=>x.id===from)!,b=cat.units.find(x=>x.id===to)!;if(getSettings().autoHistory)addHistory({type:"conversion",name:`${a.symbol} to ${b.symbol}`,subtitle:cat.name,result:`${n} ${a.symbol} → ${Number(r.toPrecision(8))} ${b.symbol}`,href:`/convert?category=${cat.id}`})}
 const fromU=cat.units.find(x=>x.id===from)!,toU=cat.units.find(x=>x.id===to)!
 return <div className="page"><div className="mb-4"><div className="text-xs font-bold text-slate-500">Units & clinical quantities</div><h1 className="text-2xl font-black">Unit Converter</h1></div>
  <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">{conversionCategories.map(c=><button key={c.id} className={`pill ${c.id===cat.id?"active":""}`} onClick={()=>setCategoryId(c.id)}>{c.name}</button>)}</div>
  <div className="card p-4"><div className="mb-2 text-sm font-black">Convert</div><div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2"><label><span className="mb-1 block text-[11px] font-bold text-slate-500">From</span><select className="field" value={from} onChange={e=>setFrom(e.target.value)}>{cat.units.map(u=><option key={u.id} value={u.id}>{u.symbol}</option>)}</select></label><button onClick={()=>{setFrom(to);setTo(from)}} className="mb-1 grid h-11 w-11 place-items-center rounded-xl border bg-white text-blue-600"><ArrowLeftRight size={18}/></button><label><span className="mb-1 block text-[11px] font-bold text-slate-500">To</span><select className="field" value={to} onChange={e=>setTo(e.target.value)}>{cat.units.map(u=><option key={u.id} value={u.id}>{u.symbol}</option>)}</select></label></div><input className="field mt-3" type="number" inputMode="decimal" placeholder="Enter value" value={value} onChange={e=>setValue(e.target.value)}/><button className="primary mt-3" onClick={run}>Convert</button>
  </div>
  {result!==null&&<div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4"><div className="text-[11px] font-extrabold uppercase text-emerald-700">Result</div><div className="mt-1 text-3xl font-black text-emerald-900">{Number(result.toPrecision(8))} {toU.symbol}</div><div className="mt-1 text-xs text-emerald-700">{value} {fromU.symbol}</div></div>}
  <h2 className="section-title">Supported units</h2><div className="card divide-y">{cat.units.map(u=><div className="flex items-center justify-between p-3 text-xs" key={u.id}><span className="font-bold">{u.name}</span><span className="text-slate-500">{u.symbol}</span></div>)}</div>
 </div>
}
export default function ConvertPage(){return <Suspense fallback={<div className="page">Loading converter…</div>}><Converter/></Suspense>}
