"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquareHeart } from "lucide-react"
import { feedbackAvailable } from "@/lib/feedback/http"

/** "Send feedback" row for Settings. Hidden when this build cannot reach the website. */
export function FeedbackSettings() {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(feedbackAvailable()), [])
  if (!show) return null
  return (
    <>
      <h2 className="section-title">Feedback</h2>
      <Link href="/feedback" className="card flex items-center gap-3 p-4">
        <MessageSquareHeart size={20} className="text-blue-600" />
        <div className="flex-1">
          <div className="text-sm font-bold">Send feedback</div>
          <div className="muted text-[11px]">A one-minute survey. Anonymous, no patient information.</div>
        </div>
        <span className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Open</span>
      </Link>
    </>
  )
}
