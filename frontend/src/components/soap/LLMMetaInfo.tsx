import { useSoapStore } from "@/hooks/useSoapStore"

export function LLMMetaInfo() {
  const { soapResult } = useSoapStore()

  if (!soapResult) return null

  const meta = soapResult.llm_meta

  return (
    <div className="flex items-center gap-4 text-xs text-gray-400">
      <span>Model: {meta.model || "-"}</span>
      <span>Latency: {meta.latency_ms.toFixed(0)}ms</span>
      <span>Cost: ${meta.cost_usd.toFixed(4)}</span>
      <span>
        Tokens: {meta.input_tokens}in / {meta.output_tokens}out
        {meta.cache_read_tokens > 0 && ` (cache: ${meta.cache_read_tokens})`}
      </span>
    </div>
  )
}
