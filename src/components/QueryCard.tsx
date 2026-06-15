import { ReactNode } from "react"

interface CardProps {
  title: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="card animate-fadeIn">
      <h3 className="text-cardTitle text-textPrimary mb-3">{title}</h3>
      {children}
    </div>
  )
}

export function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-divider last:border-0">
      <span className="text-body text-textSecondary">{label}</span>
      <span className={`text-data ${highlight ? "text-success" : "text-textPrimary"}`}>{value}</span>
    </div>
  )
}
