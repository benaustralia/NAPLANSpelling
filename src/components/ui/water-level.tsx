import * as React from "react"

import { cn } from "@/lib/utils"

interface WaterLevelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 100 = full (start of gap), drains to 0 as the next word approaches. */
  value: number
}

const WaterLevel = React.memo(function WaterLevel({
  value,
  className,
  ...props
}: WaterLevelProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      {...props}
      data-slot="water-level"
      className={cn(
        "relative w-3.5 h-7 rounded-full border border-current/25 bg-current/5 overflow-hidden text-primary",
        className,
      )}
    >
      <div
        className="absolute inset-x-0 bottom-0 rounded-full bg-current/70 transition-[height] duration-150 ease-linear"
        style={{ height: `${clamped}%` }}
      />
    </div>
  )
})

export { WaterLevel }
