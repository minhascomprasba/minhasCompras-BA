import type { ComponentProps } from "react"
import { cn } from "cn"

function Alert({ className, variant = "default", ...props }: ComponentProps<"div"> & { variant?: "default" | "destructive" }) {
  return <div data-slot="alert" role={variant === "destructive" ? "alert" : "status"} className={cn("relative w-full rounded-lg border border-border p-3 text-sm", variant === "destructive" ? "border-destructive/30 text-destructive" : "bg-muted text-foreground", className)} {...props} />
}

export { Alert }
