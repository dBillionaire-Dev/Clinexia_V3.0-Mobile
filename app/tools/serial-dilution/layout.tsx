import { PremiumGate } from "@/components/premium-gate"

// Premium locking for this tool (does nothing unless locking is switched on in the Clinexia server).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate category="lab-solutions">{children}</PremiumGate>
}
