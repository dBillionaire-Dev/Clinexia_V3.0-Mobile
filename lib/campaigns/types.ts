// Notices and review forms the Clinexia admin sets up on the website. The app receives only what it needs to show them.
export type QuestionType = "rating" | "text" | "choice" | "multi" | "yesno"
export interface Question { id: string; type: QuestionType; label: string; options?: string[]; required: boolean }
/** Where a campaign appears: the website, the Android app, or the mobile website. */
export type Platform = "web" | "android" | "mobile_web"
export type Answers = Record<string, string | number | string[]>

export interface Campaign {
  id: string; version: number; title: string
  kind: "notice" | "form"; presentation: "modal" | "banner" | "toast"
  heading: string; body: string; ctaLabel: string; ctaUrl: string; questions: Question[]
  audience: "everyone" | "guests" | "signed_in"; platforms?: Platform[]; frequency: "once" | "every_visit" | "every_days"; repeatDays: number
  allowLater: boolean; laterHours: number; durationSeconds: number | null; dismissible: boolean
  startsAt: string | null; endsAt: string | null; status: "draft" | "active" | "paused"
}
export type PublicCampaign = Omit<Campaign, "title" | "status">

export function isLive(c: Pick<Campaign, "status" | "startsAt" | "endsAt">, now: number): boolean {
  if (c.status !== "active") return false
  if (c.startsAt && Date.parse(c.startsAt) > now) return false
  if (c.endsAt && Date.parse(c.endsAt) <= now) return false
  return true
}
export const platformMatches = (c: { platforms?: Platform[] }, platform: Platform) => !c.platforms || c.platforms.includes(platform)
export const audienceMatches = (c: Pick<Campaign, "audience">, signedIn: boolean) => c.audience === "everyone" || (c.audience === "signed_in" ? signedIn : !signedIn)
