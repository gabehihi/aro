import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getPolypharmacyPrefill, reviewPolypharmacy } from "@/api/polypharmacy"
import { getPrescriptions } from "@/api/prescriptions"
import { PatientSelector } from "@/components/documents/PatientSelector"
import { DDIFindings } from "@/components/polypharmacy/DDIFindings"
import { DrugListPanel } from "@/components/polypharmacy/DrugListPanel"
import { RenalDosingPanel } from "@/components/polypharmacy/RenalDosingPanel"
import { SickDayAlertsPanel } from "@/components/polypharmacy/SickDayAlertsPanel"
import { Card, CardContent } from "@/components/ui/card"
import { usePolypharmacyStore } from "@/hooks/usePolypharmacyStore"

export function PolypharmacyReview() {
  const store = usePolypharmacyStore()
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false)
  const [prescriptionMessage, setPrescriptionMessage] = useState<string | null>(null)
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!store.selectedPatient) {
      setPrescriptionMessage(null)
      setPrefillMessage(null)
      return
    }

    const patientId = store.selectedPatient.id

    setIsLoadingPrescriptions(true)

    Promise.allSettled([
      getPrescriptions(patientId),
      getPolypharmacyPrefill(patientId),
    ]).then(([prescResult, prefillResult]) => {
      // 처방 로드
      if (prescResult.status === "fulfilled") {
        const inns = Array.from(
          new Set(
            prescResult.value
              .map((p) => p.ingredient_inn?.trim().toLowerCase() ?? "")
              .filter(Boolean),
          ),
        )
        store.setDrugInns(inns)
        setPrescriptionMessage(
          inns.length > 0
            ? `${store.selectedPatient?.name} 환자의 활성 처방 ${inns.length}건을 불러왔습니다.`
            : "활성 처방의 INN 정보가 없어 수동 입력이 필요합니다.",
        )
      } else {
        setPrescriptionMessage("활성 처방을 불러오지 못했습니다. 직접 입력해 주세요.")
      }

      // 신기능 프리필 로드
      if (prefillResult.status === "fulfilled") {
        const prefill = prefillResult.value
        const messages: string[] = []

        if (prefill.egfr != null) {
          store.setEgfr(String(prefill.egfr))
          messages.push(`eGFR ${prefill.egfr}`)
        }
        if (prefill.crcl != null) {
          store.setCrcl(String(prefill.crcl))
          messages.push(`CrCl ${prefill.crcl}`)
        }

        if (messages.length > 0) {
          const crInfo = prefill.serum_cr != null ? ` (Cr ${prefill.serum_cr} mg/dL)` : ""
          setPrefillMessage(`신기능 자동 입력: ${messages.join(", ")} mL/min${crInfo}`)
        } else if (prefill.serum_cr != null) {
          setPrefillMessage(`Cr ${prefill.serum_cr} mg/dL — eGFR/CrCl 계산 불가 (체중 미입력)`)
        } else {
          setPrefillMessage("최근 검사 기록 없음 — 신기능 직접 입력 필요")
        }
      }

      store.clearReport()
    }).finally(() => setIsLoadingPrescriptions(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedPatient?.id])

  const handleReview = async () => {
    store.setIsReviewing(true)
    store.setError(null)
    try {
      const egfrNum = store.egfr ? parseFloat(store.egfr) : undefined
      const crclNum = store.crcl ? parseFloat(store.crcl) : undefined
      const report = await reviewPolypharmacy({
        drug_inns: store.drugInns,
        egfr: egfrNum,
        crcl: crclNum,
        clinical_flags: store.clinicalFlags,
        labs: store.labs,
      })
      store.setReport(report)
    } catch {
      store.setError("약물검토 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      store.setIsReviewing(false)
    }
  }

  return (
    <div className="flex gap-4 h-full p-4">
      {/* 좌측: 입력 패널 */}
      <div className="w-80 flex-shrink-0">
        <div className="mb-4 space-y-1">
          <PatientSelector
            selected={store.selectedPatient}
            onSelect={store.setSelectedPatient}
          />
          {isLoadingPrescriptions && (
            <p className="text-xs text-gray-500">처방 및 신기능 불러오는 중...</p>
          )}
          {prescriptionMessage && (
            <p className="text-xs text-gray-500">{prescriptionMessage}</p>
          )}
          {prefillMessage && (
            <p className="text-xs text-blue-600">{prefillMessage}</p>
          )}
        </div>
        <DrugListPanel
          drugInns={store.drugInns}
          egfr={store.egfr}
          crcl={store.crcl}
          clinicalFlags={store.clinicalFlags}
          onAddDrug={store.addDrugInn}
          onRemoveDrug={store.removeDrugInn}
          onEgfrChange={store.setEgfr}
          onCrclChange={store.setCrcl}
          onToggleFlag={store.toggleClinicalFlag}
          onReview={handleReview}
          isReviewing={store.isReviewing}
        />
      </div>

      {/* 우측: 결과 패널 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {store.error && (
          <div className="bg-red-50 border border-red-300 rounded p-3 text-sm text-red-700">
            {store.error}
          </div>
        )}

        {store.isReviewing && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">약물검토 중...</span>
          </div>
        )}

        {store.report && !store.isReviewing && (
          <>
            {/* 경보 배너 */}
            {store.report.warnings.map((w) => (
              <div
                key={w.message}
                className={`rounded p-3 text-sm font-medium ${
                  w.severity === "error"
                    ? "bg-red-50 border border-red-300 text-red-700"
                    : "bg-yellow-50 border border-yellow-300 text-yellow-800"
                }`}
              >
                {w.message}
              </div>
            ))}

            {/* Sick Day 경보 */}
            <SickDayAlertsPanel alerts={store.report.sick_day_alerts} />

            {/* DDI */}
            <DDIFindings findings={store.report.ddi_findings} />

            {/* 신기능 용량 조절 */}
            <RenalDosingPanel
              recommendations={store.report.renal_recommendations}
              egfr={store.report.egfr}
              crcl={store.report.crcl}
            />

            {/* AI 요약 */}
            {store.report.llm_summary && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium">AI 검토 요약 (참고용)</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {store.report.llm_summary}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!store.report && !store.isReviewing && (
          <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
            좌측에서 약물을 추가하고 검토를 시작하세요
          </div>
        )}
      </div>
    </div>
  )
}
