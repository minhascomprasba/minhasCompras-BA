import type { ComponentProps } from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" type={type} className={cn("flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20", className)} {...props} />
}

export { Input }
