"use client"
import { useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

/** A password box with an eye button to show or hide what you typed. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`field pr-12 ${props.className ?? ""}`} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500">
        {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  )
}
