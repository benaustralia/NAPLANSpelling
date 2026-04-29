import * as React from "react"

import { cn } from "@/lib/utils"

interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  value: number
  size?: number
  strokeWidth?: number
}

const CircularProgress = React.memo(function CircularProgress({
  value,
  size = 40,
  strokeWidth = 4,
  className,
  ...props
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <svg
      {...props}
      data-slot="circular-progress"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("text-muted-foreground", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-current opacity-20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-current opacity-60"
      />
    </svg>
  )
})

export { CircularProgress }
