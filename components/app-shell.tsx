"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calculator, Clock3, House, Menu, Search, SlidersHorizontal, ArrowLeftRight, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { calculators } from "@/lib/calculators/registry"
import { conversionCategories } from "@/lib/conversions/registry"
import { watchAppearance } from "@/lib/theme"
import { isNative } from "@/lib/native"
import { NativeBridge } from "@/components/native-bridge"
import { AnalyticsSync } from "@/components/analytics-sync"
import { APP_VERSION } from "@/lib/app-info"
import { UpdatePrompt } from "@/components/update-prompt"
import { FeedbackPrompt } from "@/components/feedback-prompt"
import { AccountMenu } from "@/components/account-menu"
import { CampaignHost } from "@/components/campaign-host"
import { GuestGuard } from "@/components/guest-guard"
import { PushBridge } from "@/components/push-bridge"

const tabs=[{href:"/",label:"Home",Icon:House},{href:"/calculators",label:"Calculators",Icon:Calculator},{href:"/convert",label:"Convert",Icon:ArrowLeftRight},{href:"/history",label:"History",Icon:Clock3},{href:"/tools",label:"Tools",Icon:SlidersHorizontal}]

export function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname(); const [search,setSearch]=useState(false); const [drawer,setDrawer]=useState(false); const [q,setQ]=useState("")
 useEffect(()=>{setSearch(false);setDrawer(false);setQ("")},[path])
 useEffect(()=>watchAppearance(),[])
 // Tells the Android back button that the menu or search is open, and lets it close them.
 useEffect(()=>{const root=document.documentElement; if(drawer||search)root.dataset.overlay="1"; else delete root.dataset.overlay; const close=()=>{setDrawer(false);setSearch(false)}; window.addEventListener("convertlab:close-overlay",close); return()=>window.removeEventListener("convertlab:close-overlay",close)},[drawer,search])
 useEffect(()=>{if(!("serviceWorker" in navigator)||isNative())return; if(process.env.NODE_ENV==="production"){navigator.serviceWorker.register("/sw.js").catch(()=>{})}else{navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if("caches" in window)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{})}},[])
 const results=useMemo(()=>{
  const s=q.trim().toLowerCase(); if(!s)return []
  const c=calculators.filter(x=>[x.name,x.description,...(x.keywords??[])].join(" ").toLowerCase().includes(s)).slice(0,8).map(x=>({name:x.name,sub:x.description,href:`/calculators/${x.category}/${x.id}`}))
  const v=conversionCategories.filter(x=>[x.name,...x.units.map(u=>u.name+u.symbol)].join(" ").toLowerCase().includes(s)).slice(0,4).map(x=>({name:`${x.name} converter`,sub:`${x.units.length} supported units`,href:`/convert?category=${x.id}`}))
  return [...c,...v]
 },[q])
 return <div className="min-h-dvh">
  <header className="safe-top sticky top-0 z-40 bg-[var(--navy)] text-white shadow-md">
   <div className="mx-auto flex h-16 max-w-[900px] items-center gap-3 px-4">
    <button aria-label="Menu" onClick={()=>setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10"><Menu size={21}/></button>
    <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 font-extrabold tracking-tight"><img src="/icon-192x192.png" alt="" data-clx="logo" className="h-8 w-8 rounded-lg"/><span data-clx="word">Clinexia</span></Link>
    <AccountMenu/>
    <button aria-label="Search" onClick={()=>setSearch(true)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10"><Search size={20}/></button>
   </div>
  </header>
  <CampaignHost/>
  <main id="main-content">{children}</main>
  <NativeBridge/>
  <AnalyticsSync/>
  <UpdatePrompt/>
  <FeedbackPrompt/>
  <GuestGuard/>
  <PushBridge/>
  <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
   <div className="mx-auto grid h-[72px] max-w-[900px] grid-cols-5 px-1">{tabs.map(({href,label,Icon})=>{const active=href==="/"?path===href:path.startsWith(href);return <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${active?"text-blue-600":"text-slate-500"}`}><Icon size={20}/><span>{label}</span></Link>})}</div>
  </nav>
  {drawer&&<div className="fixed inset-0 z-50 flex"><button aria-label="Close menu" className="absolute inset-0 bg-black/45" onClick={()=>setDrawer(false)}/><aside className="relative safe-top safe-bottom flex h-full w-[82%] max-w-[340px] flex-col bg-[var(--navy-2)] p-4 text-white shadow-2xl">
   <div className="mb-6 flex items-center gap-3 px-2 pt-2"><img src="/icon-192x192.png" className="h-11 w-11 rounded-xl" alt=""/><div><div className="text-lg font-extrabold">Clinexia</div><div className="text-xs text-blue-200">v{APP_VERSION} mobile</div></div><button className="ml-auto" onClick={()=>setDrawer(false)}><X/></button></div>
   <div className="space-y-1">{[{href:"/",label:"Home"},{href:"/calculators",label:"Calculators"},{href:"/convert",label:"Convert"},{href:"/history",label:"History"},{href:"/tools",label:"Lab Tools"},{href:"/estimators",label:"Estimators"},{href:"/references",label:"References"},{href:"/favorites",label:"Favorites"},{href:"/account",label:"Account"},{href:"/settings",label:"Settings"},{href:"/about",label:"About"}].map(x=><Link key={x.href} href={x.href} className={`block rounded-xl px-4 py-3 text-sm font-bold ${path===x.href?"bg-blue-600":"hover:bg-white/10"}`}>{x.label}</Link>)}</div>
   <div className="mt-auto rounded-xl bg-white/5 p-4 text-xs text-blue-100"><b className="block text-emerald-300">Local first</b>Your history and favorites stay on this device.</div>
  </aside></div>}
  {search&&<div className="fixed inset-0 z-50 bg-black/45 p-3 pt-[calc(env(safe-area-inset-top)+20px)]"><div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center gap-2 border-b p-3"><Search className="text-slate-400" size={20}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search calculators and conversions" className="min-w-0 flex-1 border-0 p-2 outline-none"/><button onClick={()=>setSearch(false)}><X/></button></div><div className="max-h-[70vh] overflow-auto p-2">{results.map(r=><Link href={r.href} key={r.href} className="block rounded-xl p-3 hover:bg-slate-50"><div className="text-sm font-bold">{r.name}</div><div className="mt-1 line-clamp-1 text-xs text-slate-500">{r.sub}</div></Link>)}{q&&results.length===0&&<div className="p-6 text-center text-sm text-slate-500">No matching tools found.</div>}</div></div></div>}
 </div>
}
