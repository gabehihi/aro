import { useState, useEffect, useCallback } from "react"
import { Search, UserPlus, ChevronLeft, ChevronRight, Pencil, X, Check, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getPatients, createPatient, updatePatient } from "@/api/patients"
import type { Patient, PatientCreate, PatientUpdate, InsuranceType, Sex } from "@/types"

const INSURANCE_OPTIONS: InsuranceType[] = [
  "건강보험",
  "의료급여",
  "산재",
  "자동차보험",
  "비급여",
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function sexLabel(sex: Sex) {
  return sex === "M" ? "남" : "여"
}

function formatBirthDate(dateStr: string) {
  if (!dateStr) return ""
  return dateStr.replace(/-/g, ".")
}

interface PatientCardItemProps {
  patient: Patient
  selected: boolean
  onClick: () => void
}

function PatientCardItem({ patient, selected, onClick }: PatientCardItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
        selected
          ? "bg-blue-50 border-blue-300 text-blue-900"
          : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{patient.name}</span>
        <span className="text-xs text-gray-500">{sexLabel(patient.sex)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        {patient.chart_no} · {formatBirthDate(patient.birth_date)}
      </div>
    </button>
  )
}

interface PatientDetailProps {
  patient: Patient
  onEditSaved: (updated: Patient) => void
}

function PatientDetail({ patient, onEditSaved }: PatientDetailProps) {
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.phone ?? "")
  const [address, setAddress] = useState(patient.address ?? "")
  const [insuranceType, setInsuranceType] = useState<InsuranceType>(patient.insurance_type)
  const [chronicDiseases, setChronicDiseases] = useState(patient.chronic_diseases.join(", "))
  const [allergies, setAllergies] = useState(patient.allergies.join(", "))
  const [memo, setMemo] = useState(patient.memo ?? "")

  useEffect(() => {
    setEditing(false)
    setError(null)
    setName(patient.name)
    setPhone(patient.phone ?? "")
    setAddress(patient.address ?? "")
    setInsuranceType(patient.insurance_type)
    setChronicDiseases(patient.chronic_diseases.join(", "))
    setAllergies(patient.allergies.join(", "))
    setMemo(patient.memo ?? "")
  }, [patient.id])

  function handleCancel() {
    setEditing(false)
    setError(null)
    setName(patient.name)
    setPhone(patient.phone ?? "")
    setAddress(patient.address ?? "")
    setInsuranceType(patient.insurance_type)
    setChronicDiseases(patient.chronic_diseases.join(", "))
    setAllergies(patient.allergies.join(", "))
    setMemo(patient.memo ?? "")
  }

  async function handleSave() {
    setError(null)
    setIsSaving(true)
    const body: PatientUpdate = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      insurance_type: insuranceType,
      chronic_diseases: chronicDiseases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      memo: memo.trim() || undefined,
    }
    try {
      const updated = await updatePatient(patient.id, body)
      onEditSaved(updated)
      setEditing(false)
    } catch {
      setError("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const rows: { label: string; value: string }[] = [
    { label: "차트번호", value: patient.chart_no },
    { label: "생년월일", value: formatBirthDate(patient.birth_date) },
    { label: "성별", value: sexLabel(patient.sex) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            수정
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          {/* 고정 정보 */}
          {rows.map((r) => (
            <div key={r.label} className="flex text-sm">
              <span className="w-28 text-gray-500 flex-shrink-0">{r.label}</span>
              <span className="text-gray-900">{r.value}</span>
            </div>
          ))}

          {/* 수정 가능한 기본 정보 */}
          <div className="flex text-sm items-center">
            <span className="w-28 text-gray-500 flex-shrink-0">이름</span>
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm"
              />
            ) : (
              <span className="text-gray-900">{patient.name}</span>
            )}
          </div>

          <div className="flex text-sm items-center">
            <span className="w-28 text-gray-500 flex-shrink-0">보험종류</span>
            {editing ? (
              <select
                value={insuranceType}
                onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}
                className="border rounded px-2 py-1 text-sm text-gray-900 bg-white"
              >
                {INSURANCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-gray-900">{patient.insurance_type}</span>
            )}
          </div>

          <div className="flex text-sm items-center">
            <span className="w-28 text-gray-500 flex-shrink-0">연락처</span>
            {editing ? (
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="h-7 text-sm"
              />
            ) : (
              <span className="text-gray-900">{patient.phone ?? "—"}</span>
            )}
          </div>

          <div className="flex text-sm items-start">
            <span className="w-28 text-gray-500 flex-shrink-0 pt-0.5">주소</span>
            {editing ? (
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-7 text-sm"
              />
            ) : (
              <span className="text-gray-900">{patient.address ?? "—"}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 만성질환 */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">만성질환</p>
          {editing ? (
            <Input
              value={chronicDiseases}
              onChange={(e) => setChronicDiseases(e.target.value)}
              placeholder="E11, I10, ... (쉼표로 구분)"
              className="text-sm"
            />
          ) : patient.chronic_diseases.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {patient.chronic_diseases.map((d) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">없음</span>
          )}
        </CardContent>
      </Card>

      {/* 알레르기 */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">알레르기</p>
          {editing ? (
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="페니실린, 아스피린, ... (쉼표로 구분)"
              className="text-sm"
            />
          ) : patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.map((a) => (
                <Badge key={a} variant="destructive">
                  {a}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">없음</span>
          )}
        </CardContent>
      </Card>

      {/* 메모 */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">메모</p>
          {editing ? (
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {patient.memo || <span className="text-gray-400">없음</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {editing && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="w-3.5 h-3.5 mr-1" />
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            저장
          </Button>
        </div>
      )}
    </div>
  )
}

interface NewPatientFormProps {
  onSaved: (patient: Patient) => void
  onCancel: () => void
}

function NewPatientForm({ onSaved, onCancel }: NewPatientFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chartNo, setChartNo] = useState("")
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [sex, setSex] = useState<Sex>("M")
  const [insuranceType, setInsuranceType] = useState<InsuranceType>("건강보험")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [chronicDiseases, setChronicDiseases] = useState("")
  const [allergies, setAllergies] = useState("")
  const [memo, setMemo] = useState("")

  async function handleSave() {
    if (!chartNo.trim() || !name.trim() || !birthDate || !sex || !insuranceType) {
      setError("차트번호, 이름, 생년월일, 성별, 보험종류는 필수입니다.")
      return
    }
    setError(null)
    setIsSaving(true)
    const body: PatientCreate = {
      chart_no: chartNo.trim(),
      name: name.trim(),
      birth_date: birthDate,
      sex,
      insurance_type: insuranceType,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      chronic_diseases: chronicDiseases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      memo: memo.trim() || undefined,
    }
    try {
      const created = await createPatient(body)
      onSaved(created)
    } catch {
      setError("등록 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">신규 환자 등록</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              차트번호 <span className="text-red-500">*</span>
            </label>
            <Input
              value={chartNo}
              onChange={(e) => setChartNo(e.target.value)}
              placeholder="예: 2024-0001"
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              생년월일 <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              성별 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(["M", "F"] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`px-4 py-1.5 rounded border text-sm transition-colors ${
                    sex === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s === "M" ? "남" : "여"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              보험종류 <span className="text-red-500">*</span>
            </label>
            <select
              value={insuranceType}
              onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}
              className="w-full border rounded px-2 py-1.5 text-sm text-gray-900 bg-white"
            >
              {INSURANCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">연락처</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">주소</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">만성질환</label>
            <Input
              value={chronicDiseases}
              onChange={(e) => setChronicDiseases(e.target.value)}
              placeholder="E11, I10, ... (쉼표로 구분)"
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">알레르기</label>
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="페니실린, 아스피린, ... (쉼표로 구분)"
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : null}
          저장
        </Button>
      </div>
    </div>
  )
}

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedQuery = useDebounce(searchQuery, 500)

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [mode, setMode] = useState<"view" | "new">("view")

  const fetchPatients = useCallback(async () => {
    setIsLoading(true)
    setListError(null)
    try {
      const resp = await getPatients(debouncedQuery, page, PAGE_SIZE)
      setPatients(resp.items)
      setTotal(resp.total)
    } catch {
      setListError("환자 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, page])

  useEffect(() => {
    void fetchPatients()
  }, [fetchPatients])

  // 검색어 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setMode("view")
  }

  function handleNewPatient() {
    setSelectedPatient(null)
    setMode("new")
  }

  function handleEditSaved(updated: Patient) {
    setSelectedPatient(updated)
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function handleNewSaved(created: Patient) {
    setMode("view")
    setSelectedPatient(created)
    void fetchPatients()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex gap-4 h-full">
      {/* 좌측 패널 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="이름 또는 차트번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 신규 등록 버튼 */}
        <Button
          variant="outline"
          className="w-full gap-1.5 text-sm"
          onClick={handleNewPatient}
        >
          <UserPlus className="w-4 h-4" />
          신규 환자 등록
        </Button>

        {/* 환자 목록 */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : listError ? (
            <p className="text-sm text-red-500 text-center py-4">{listError}</p>
          ) : patients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {debouncedQuery ? "검색 결과가 없습니다" : "등록된 환자가 없습니다"}
            </p>
          ) : (
            patients.map((p) => (
              <PatientCardItem
                key={p.id}
                patient={p}
                selected={selectedPatient?.id === p.id}
                onClick={() => handleSelectPatient(p)}
              />
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {total > 0 && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-gray-500">총 {total}명</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-600 w-12 text-center">
                {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 overflow-y-auto">
        {mode === "new" ? (
          <NewPatientForm
            onSaved={handleNewSaved}
            onCancel={() => setMode("view")}
          />
        ) : selectedPatient ? (
          <PatientDetail
            patient={selectedPatient}
            onEditSaved={handleEditSaved}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            좌측에서 환자를 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}
