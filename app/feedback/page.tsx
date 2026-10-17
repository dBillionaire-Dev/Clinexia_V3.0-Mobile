import type { Metadata } from "next"
import { FeedbackForm } from "@/components/feedback-form"

export const metadata: Metadata = { title: "Feedback" }

export default function FeedbackPage() {
  return (
    <div className="page pb-28">
      <FeedbackForm />
    </div>
  )
}
