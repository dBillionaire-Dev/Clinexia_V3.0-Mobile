"use client"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Heart, Info, RotateCcw, ShieldAlert } from "lucide-react"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { getCalculatorById, getRecommendedCalculators } from "@/lib/calculators/registry"
import { CALCULATION_DISCLAIMER, LAB_PREP_DISCLAIMER, type CalculationResult, type CalculatorDefinition } from "@/lib/calculators/types"
import { getCalculatorReferences } from "@/lib/calculators/dosing-references"
import { addHistory, getFavorites, getSettings, toggleFavorite } from "@/lib/client-store"
import { haptic } from "@/lib/native"
import { trackCalculation } from "@/lib/analytics/track"
import { ExternalAnchor } from "@/components/external-link"
import { AccessBadge } from "@/components/access-badge"
import { PremiumGate } from "@/components/premium-gate"

function CalculatorRunnerInner({id}:{id:string}){
 const maybeDef=useMemo(()=>getCalculatorById(id),[id]);
 const [values,setValues]=useState<Record<string,string>>({}); const [result,setResult]=useState<CalculationResult|null>(null); const [error,setError]=useState(""); const [fav,setFav]=useState(false)
 useEffect(()=>{if(!maybeDef)return; const initial:Record<string,string>={}; for(const f of maybeDef.inputs){if(f.kind==="select"&&f.defaultValue!==undefined)initial[f.id]=String(f.defaultValue)} setValues(initial); setResult(null); setError(""); setFav(getFavorites().includes(maybeDef.id))},[maybeDef])
 if(!maybeDef)return <div className="page"><h1 className="text-xl font-black">Calculator not found</h1></div>
 const def:CalculatorDefinition=maybeDef
 const references=getCalculatorReferences(def); const recs=getRecommendedCalculators(def,4)
 function submit(e:FormEvent){e.preventDefault();setError("");try{const parsed:Record<string,number|string>={};for(const f of def.inputs){const raw=values[f.id]??""; if(raw===""){if(f.optional)continue; throw new Error(`${f.label} is required.`)} parsed[f.id]=f.kind==="number"?Number(raw):raw} const next=def.calculate(parsed); setResult(next); void haptic("success"); void trackCalculation({calculatorId:def.id,calculatorName:def.name,category:def.category}); if(getSettings().autoHistory)addHistory({type:"calculator",name:def.name,subtitle:def.category,result:next.display,href:`/calculators/${def.category}/${def.id}`})}catch(err){setResult(null);setError(err instanceof Error?err.message:"Unable to calculate. Check your inputs.")}}
 function reset(){const initial:Record<string,string>={};for(const f of def.inputs){if(f.kind==="select"&&f.defaultValue!==undefined)initial[f.id]=String(f.defaultValue)}setValues(initial);setResult(null);setError("")}
 return <div className="page">
  <div className="mb-4 flex items-center gap-2"><Link href={`/calculators/${def.category}`} className="grid h-9 w-9 place-items-center rounded-xl border bg-white"><ArrowLeft size={18}/></Link><div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{def.category.replaceAll("-"," ")}<AccessBadge id={def.id} category={def.category}/></div><h1 className="truncate text-xl font-black">{def.name}</h1></div><button aria-label="Favorite" onClick={()=>{setFav(toggleFavorite(def.id).includes(def.id))}} className="grid h-9 w-9 place-items-center rounded-xl border bg-white"><Heart size={18} className={fav?"fill-amber-400 text-amber-400":"text-slate-500"}/></button></div>
  <p className="mb-4 text-sm leading-5 text-slate-600">{def.description}</p>
  <form onSubmit={submit} className="card p-4">
   <div className="space-y-4">{def.inputs.map(f=><label key={f.id} className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-extrabold text-slate-700"><span>{f.label}{f.optional?<span className="font-normal text-slate-400"> · optional</span>:null}</span>{f.unit&&<span className="font-semibold text-slate-400">{f.unit}</span>}</span>{f.kind==="select"?<select className="field" value={values[f.id]??""} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}><option value="">Select…</option>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.kind==="date"?<input className="field" type="date" value={values[f.id]??""} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}/>:<input className="field" type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step??"any"} placeholder={f.placeholder??(f.defaultValue!==undefined?`e.g. ${f.defaultValue}`:undefined)} value={values[f.id]??""} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}/>} {f.helpText&&<span className="mt-1 block text-[11px] leading-4 text-slate-400">{f.helpText}</span>}</label>)}</div>
   {error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
   <div className="mt-5 flex gap-2"><button className="primary flex-1" type="submit">Calculate</button><button type="button" onClick={reset} className="grid w-12 place-items-center rounded-xl border bg-white text-slate-500"><RotateCcw size={18}/></button></div>
  </form>
  {result&&<section className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm"><div className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">Result</div><div className="mt-1 text-3xl font-black tracking-tight text-emerald-900">{result.display}</div>{result.secondary?.length?<div className="mt-4 divide-y divide-emerald-100 rounded-xl bg-white/70 px-3">{result.secondary.map(x=><div key={x.label} className="flex items-center justify-between py-2.5 text-xs"><span className="font-bold text-slate-600">{x.label}</span><span className="font-extrabold text-slate-900">{x.value}</span></div>)}</div>:null}{result.interpretation&&<p className="mt-3 text-xs leading-5 text-slate-700">{result.interpretation}</p>}{result.warnings?.map(w=><div key={w} className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert size={16} className="shrink-0"/>{w}</div>)}</section>}
  {(def.formula||def.notes?.length||def.limitations?.length||references.length>0)&&<section className="card mt-4 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-black"><Info size={17} className="text-blue-600"/> Clinical notes & sources</div>{def.formula&&<div className="mb-3"><div className="text-[11px] font-extrabold uppercase text-slate-400">Formula</div><div className="mt-1 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5">{def.formula}</div></div>}{def.notes?.map(n=><p key={n} className="mb-2 text-xs leading-5 text-slate-600">{n}</p>)}{def.limitations?.length?<div className="mt-3"><div className="text-[11px] font-extrabold uppercase text-slate-400">Limitations</div>{def.limitations.map(n=><p key={n} className="mt-1 text-xs leading-5 text-slate-600">• {n}</p>)}</div>:null}{references.length>0&&<div className="mt-4 border-t pt-3"><div className="text-[11px] font-extrabold uppercase text-slate-400">References</div>{references.map((r,i)=>r.url?<ExternalAnchor key={`${r.url}-${i}`} href={r.url} className="mt-2 flex items-start gap-2 text-xs font-bold text-blue-700"><ExternalLink size={14} className="mt-0.5 shrink-0"/><span>{r.source} · {r.version}</span></ExternalAnchor>:<div key={`${r.source}-${i}`} className="mt-2 text-xs font-bold text-slate-700">{r.source} · {r.version}</div>)}</div>}</section>}
  {recs.length>0&&<section><h2 className="section-title">Related tools</h2><div className="card divide-y overflow-hidden">{recs.map(r=><Link key={r.id} href={`/calculators/${r.category}/${r.id}`} className="block p-3 text-sm font-bold">{r.name}<AccessBadge id={r.id} category={r.category}/><span className="mt-1 block text-[11px] font-normal text-slate-500">{r.description}</span></Link>)}</div></section>}
  <p className="mt-4 rounded-xl bg-slate-100 p-3 text-[10px] leading-4 text-slate-500">{def.category==="lab-solutions"?LAB_PREP_DISCLAIMER:CALCULATION_DISCLAIMER}</p>
 </div>
}
/** Public entry point: the calculator behind the premium lock (does nothing unless locking is switched on in the Clinexia server). */
export function CalculatorRunner({id}:{id:string}){
 const def=getCalculatorById(id)
 return def ? <PremiumGate id={def.id} category={def.category}><CalculatorRunnerInner id={id}/></PremiumGate> : <CalculatorRunnerInner id={id}/>
}
