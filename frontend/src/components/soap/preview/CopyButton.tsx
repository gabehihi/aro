import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  text: string
  label?: string
  size?: "xs" | "sm" | "default"
  disabled?: boolean
}

export function CopyButton({ text, label = "복사", size = "sm", disabled }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleCopy}
      disabled={disabled || !text}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "복사됨" : label}
    </Button>
  )
}
