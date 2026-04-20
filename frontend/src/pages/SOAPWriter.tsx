import { ExternalLink, RotateCcw } from "lucide-react"
import { useEffect, useRef } from "react"
import { getSoapPrefill } from "@/api/encounters"
import { PatientSearchBar } from "@/components/soap/PatientSearchBar"
import { PatientSummaryCard } from "@/components/soap/PatientSummaryCard"
import { VisitTypeSelector } from "@/components/soap/VisitTypeSelector"
import { SaveEncounterButton } from "@/components/soap/SaveEncounterButton"
import { ClinicalDashboard } from "@/components/soap/ClinicalDashboard"
import { DiseasePicker } from "@/components/soap/chronic/DiseasePicker"
import { DiseaseSections } from "@/components/soap/chronic/DiseaseSections"
import { EducationChecklist } from "@/components/soap/chronic/EducationChecklist"
import { SymptomSelector } from "@/components/soap/acute/SymptomSelector"
import { OnsetInput } from "@/components/soap/acute/OnsetInput"
import { HPIBuilder } from "@/components/soap/acute/HPIBuilder"
import { AcuteObjectiveCard } from "@/components/soap/acute/AcuteObjectiveCard"
import { AcuteAssessmentCard } from "@/components/soap/acute/AcuteAssessmentCard"
import { AcutePlanCard } from "@/components/soap/acute/AcutePlanCard"
import { SOAPPreviewPane } from "@/components/soap/preview/SOAPPreviewPane"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSoapStore } from "@/hooks/useSoapStore"
import { resolveAutomaticPrefill, toPrefillPatch } from "@/utils/soap/prefill"

export function SOAPWriter() {
  const selectedPatient = useSoapStore((s) => s.selectedPatient)
  const mode = useSoapStore((s) => s.mode)
  const setMode = useSoapStore((s) => s.setMode)
  const applyPrefill = useSoapStore((s) => s.applyPrefill)
  const setIsPrefilling = useSoapStore((s) => s.setIsPrefilling)
  const setError = useSoapStore((s) => s.setError)
  const setLastEncounterDate = useSoapStore((s) => s.setLastEncounterDate)
  const isPrefilling = useSoapStore((s) => s.isPrefilling)
  const error = useSoapStore((s) => s.error)
  const lastEncounterDate = useSoapStore((s) => s.lastEncounterDate)
  const hasUserEdits = useSoapStore((s) => s.hasUserEdits)

  // Ref that SOAPPreviewPane registers its openPopup callback into
  const previewOpenerRef = useRef<(() => void) | null>(null)

  // Track previous patient ID for auto-open popup
  const prevPatientIdRef = useRef<string | null>(null)

  async function handleReapplyPrefill() {
    if (!selectedPatient) return
    if (
      hasUserEdits &&
      !window.confirm("현재 입력 중인 내용이 최근 진료값으로 덮어써집니다. 다시 채울까요?")
    ) {
      return
    }

    setIsPrefilling(true)
    setError(null)
    try {
      const data = await getSoapPrefill(selectedPatient.id)
      applyPrefill(toPrefillPatch(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "프리필 로드 실패")
    } finally {
      setIsPrefilling(false)
    }
  }

  // 환자 선택 시 자동 프리필
  useEffect(() => {
    if (!selectedPatient) return
    let cancelled = false
    setIsPrefilling(true)
    setError(null)
    getSoapPrefill(selectedPatient.id)
      .then((data) => {
        if (cancelled) return
        const resolution = resolveAutomaticPrefill(
          data,
          useSoapStore.getState().hasUserEdits,
        )
        if (resolution.type === "apply") {
          applyPrefill(resolution.patch)
          return
        }
        setLastEncounterDate(resolution.lastEncounterDate)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "프리필 로드 실패")
      })
      .finally(() => {
        if (!cancelled) setIsPrefilling(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPatient, applyPrefill, setIsPrefilling, setError, setLastEncounterDate])

  // 환자 선택 시 복붙 창 자동 오픈
  useEffect(() => {
    if (selectedPatient && selectedPatient.id !== prevPatientIdRef.current) {
      prevPatientIdRef.current = selectedPatient.id
      // Small delay so popup fires after user click propagation
      setTimeout(() => previewOpenerRef.current?.(), 50)
    }
    if (!selectedPatient) {
      prevPatientIdRef.current = null
    }
  }, [selectedPatient])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">SOAP 작성</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => previewOpenerRef.current?.()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            복붙 창 열기
          </Button>
          <VisitTypeSelector />
        </div>
      </div>

      <PatientSearchBar />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left panel (60%) */}
        <div className="space-y-3 lg:col-span-3">
          <PatientSummaryCard />
          {selectedPatient ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">
                {lastEncounterDate
                  ? `직전 방문: ${new Date(lastEncounterDate).toLocaleDateString("ko-KR")}`
                  : isPrefilling
                    ? "프리필 로드 중..."
                    : "직전 방문 기록 없음"}
              </span>
              {lastEncounterDate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => void handleReapplyPrefill()}
                  disabled={isPrefilling}
                >
                  <RotateCcw className="h-3 w-3" />
                  최근값 다시 채우기
                </Button>
              ) : null}
              {lastEncounterDate ? (
                <span className={hasUserEdits ? "text-amber-600" : "text-emerald-600"}>
                  {hasUserEdits ? "수정된 입력이 있어 재적용 시 덮어써집니다" : "자동 프리필 상태"}
                </span>
              ) : null}
            </div>
          ) : null}

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "chronic" | "acute")}
          >
            <TabsList>
              <TabsTrigger value="chronic">만성</TabsTrigger>
              <TabsTrigger value="acute">급성</TabsTrigger>
            </TabsList>
            <TabsContent value="chronic" className="space-y-3 pt-3">
              <DiseasePicker />
              <DiseaseSections />
              <EducationChecklist />
            </TabsContent>
            <TabsContent value="acute" className="space-y-3 pt-3">
              <SymptomSelector />
              <OnsetInput />
              <HPIBuilder />
              <AcuteObjectiveCard />
              <AcuteAssessmentCard />
              <AcutePlanCard />
            </TabsContent>
          </Tabs>

          <SOAPPreviewPane onRegisterOpener={(fn) => { previewOpenerRef.current = fn }} />
          <SaveEncounterButton />
        </div>

        {/* Right panel (40%) */}
        {selectedPatient && (
          <div className="lg:col-span-2">
            <ClinicalDashboard />
          </div>
        )}
      </div>
    </div>
  )
}
