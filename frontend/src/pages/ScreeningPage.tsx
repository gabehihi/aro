import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useScreeningStore } from "@/hooks/useScreeningStore"
import { classifyPreview, saveScreeningResult } from "@/api/screening"
import { getPatients } from "@/api/patients"
import { ScreeningEntryForm } from "@/components/screening/ScreeningEntryForm"
import { LabResultsTable } from "@/components/screening/LabResultsTable"
import { FollowUpDashboard } from "@/components/screening/FollowUpDashboard"
import type { AbnormalFinding, Patient } from "@/types"

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

interface PatientSearchSelectProps {
  selectedPatientId: string | null
  onSelect: (patient: Patient | null) => void
}

function PatientSearchSelect({ selectedPatientId, onSelect }: PatientSearchSelectProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const [results, setResults] = useState<Patient[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    void getPatients(debouncedQuery, 1, 5).then((resp) => {
      setResults(resp.items)
      setIsOpen(true)
    })
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelectPatient(patient: Patient) {
    setSelectedLabel(`${patient.name} (${patient.chart_no})`)
    setQuery("")
    setIsOpen(false)
    onSelect(patient)
  }

  function handleClear() {
    setSelectedLabel(null)
    setQuery("")
    setResults([])
    onSelect(null)
  }

  // 선택 상태 표시
  if (selectedPatientId && selectedLabel) {
    return (
      <div className="flex items-center gap-2 border rounded px-2.5 py-1.5 bg-blue-50 border-blue-200">
        <span className="text-xs text-blue-800 flex-1">{selectedLabel}</span>
        <button type="button" onClick={handleClear} className="text-blue-400 hover:text-blue-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          className="w-full border rounded px-2 py-1.5 pl-7 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="환자 이름 또는 차트번호 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded shadow-md mt-0.5">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPatient(p)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b last:border-b-0 border-gray-100"
            >
              <span className="font-medium text-gray-900">{p.name}</span>
              <span className="text-gray-500 ml-2">{p.chart_no}</span>
              <span className="text-gray-400 ml-1">· {p.birth_date}</span>
            </button>
          ))}
        </div>
      )}
      {isOpen && results.length === 0 && debouncedQuery.trim() && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded shadow-md mt-0.5 px-3 py-2 text-xs text-gray-400">
          검색 결과 없음
        </div>
      )}
    </div>
  )
}

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
        <PatientSearchSelect
          selectedPatientId={store.selectedPatientId}
          onSelect={(patient) => {
            store.setSelectedPatientId(patient?.id ?? null)
            if (patient) {
              store.setPatientSex(patient.sex)
              const hasDm = patient.chronic_diseases.some((d) =>
                d.toUpperCase().startsWith("E11") || d.toUpperCase().startsWith("E10"),
              )
              store.setPatientHasDm(hasDm)
            }
          }}
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
