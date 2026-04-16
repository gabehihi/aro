import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useScreeningStore } from "@/hooks/useScreeningStore"
import { classifyPreview, saveScreeningResult } from "@/api/screening"
import { ScreeningEntryForm } from "@/components/screening/ScreeningEntryForm"
import { LabResultsTable } from "@/components/screening/LabResultsTable"
import { FollowUpDashboard } from "@/components/screening/FollowUpDashboard"
import type { AbnormalFinding } from "@/types"

export default function ScreeningPage() {
  const store = useScreeningStore()

  function getParsedResults(): Record<string, string | number> {
    try {
      return JSON.parse(store.resultsInput || "{}") as Record<string, string | number>
    } catch {
      return {}
    }
  }

  async function handlePreviewClassify() {
    const results = getParsedResults()
    if (!Object.keys(results).length) return
    store.setError(null)
    store.setIsClassifying(true)
    try {
      const resp = await classifyPreview({ results, patient_sex: store.patientSex })
      store.setPreviewFindings(resp.findings)
      store.setActiveTab("entry")
    } catch {
      store.setError("분류 중 오류가 발생했습니다.")
    } finally {
      store.setIsClassifying(false)
    }
  }

  async function handleSave() {
    if (!store.selectedPatientId) return
    const results = getParsedResults()
    if (!Object.keys(results).length) return
    store.setError(null)
    store.setIsSaving(true)
    try {
      const resp = await saveScreeningResult({
        patient_id: store.selectedPatientId,
        screening_type: store.screeningType,
        screening_date: store.screeningDate,
        results,
        patient_has_dm: store.patientHasDm,
      })
      store.setSavedResult(resp)
      store.setActiveTab("entry")
    } catch {
      store.setError("저장 중 오류가 발생했습니다.")
    } finally {
      store.setIsSaving(false)
    }
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left Panel */}
      <div className="w-80 flex-shrink-0 space-y-3 overflow-y-auto">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          환자 UUID를 직접 입력하세요. 환자관리 페이지 완성 후 검색 연동 예정.
        </div>
        <input
          className="w-full border rounded px-2 py-1.5 text-xs"
          placeholder="환자 UUID"
          value={store.selectedPatientId ?? ""}
          onChange={(e) => store.setSelectedPatientId(e.target.value || null)}
        />
        <ScreeningEntryForm
          onSave={handleSave}
          onPreviewClassify={handlePreviewClassify}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto">
        <Tabs
          value={store.activeTab}
          onValueChange={(v) => store.setActiveTab(v as "entry" | "dashboard")}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">F/U 대시보드</TabsTrigger>
            <TabsTrigger value="entry">검진 결과</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FollowUpDashboard />
          </TabsContent>

          <TabsContent value="entry" className="space-y-4">
            {store.error && (
              <div className="bg-red-50 border border-red-300 rounded p-3 text-sm text-red-700">
                {store.error}
              </div>
            )}

            {(store.previewFindings.length > 0 || store.savedResult) && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    {store.savedResult ? "저장된 검진 결과" : "이상소견 분류 미리보기"}
                  </p>
                  <LabResultsTable
                    findings={
                      store.savedResult
                        ? (store.savedResult.abnormal_findings as AbnormalFinding[])
                        : store.previewFindings
                    }
                  />
                  {store.savedResult?.follow_up_required && (
                    <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded p-2">
                      F/U 알림이 생성되었습니다. 대시보드 탭에서 확인하세요.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {!store.previewFindings.length && !store.savedResult && (
              <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
                좌측에서 검진 결과를 입력하세요
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
