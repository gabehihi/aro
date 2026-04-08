import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import { convertSOAP } from "@/api/soap"
import type { VisitType } from "@/types"

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: "재진", label: "재진" },
  { value: "초진", label: "초진" },
  { value: "건강상담", label: "건강상담" },
]

export function RawInputForm() {
  const {
    selectedPatient,
    rawInput,
    visitType,
    isConverting,
    setRawInput,
    setVisitType,
    setSoapResult,
    setIsConverting,
    setError,
  } = useSoapStore()

  async function handleConvert() {
    if (!selectedPatient || !rawInput.trim()) return

    setIsConverting(true)
    setError(null)
    setSoapResult(null)

    try {
      const result = await convertSOAP({
        patient_id: selectedPatient.id,
        raw_input: rawInput,
        visit_type: visitType,
      })
      setSoapResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "SOAP 변환 실패")
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">방문 유형</span>
        <div className="flex gap-1">
          {VISIT_TYPES.map((vt) => (
            <button
              key={vt.value}
              type="button"
              onClick={() => setVisitType(vt.value)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                visitType === vt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {vt.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder="속기 입력 (예: HTN DM f/u BP 130/80 HR 72 HbA1c 7.2 met1000 유지)"
        rows={5}
        className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        disabled={!selectedPatient || isConverting}
      />

      <Button
        onClick={handleConvert}
        disabled={!selectedPatient || !rawInput.trim() || isConverting}
        className="w-full"
      >
        {isConverting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI 변환 중...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI SOAP 변환
          </>
        )}
      </Button>
    </div>
  )
}
