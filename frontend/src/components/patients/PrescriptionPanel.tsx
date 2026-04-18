import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createPrescription,
  deletePrescription,
  getPrescriptions,
  updatePrescription,
} from "@/api/prescriptions"
import type {
  DrugRoute,
  Patient,
  PrescribedBy,
  Prescription,
  PrescriptionCreate,
} from "@/types"

const ROUTE_OPTIONS: DrugRoute[] = ["경구", "주사", "외용", "흡입"]
const PRESCRIBED_BY_OPTIONS: PrescribedBy[] = ["보건소", "타원"]

interface Props {
  patient: Patient
}

interface PrescriptionFormState {
  drugName: string
  ingredientInn: string
  dose: string
  frequency: string
  route: DrugRoute | ""
  prescribedBy: PrescribedBy
  sourceHospital: string
  startDate: string
}

const EMPTY_FORM: PrescriptionFormState = {
  drugName: "",
  ingredientInn: "",
  dose: "",
  frequency: "",
  route: "",
  prescribedBy: "보건소",
  sourceHospital: "",
  startDate: "",
}

function toFormState(prescription: Prescription): PrescriptionFormState {
  return {
    drugName: prescription.drug_name ?? "",
    ingredientInn: prescription.ingredient_inn ?? "",
    dose: prescription.dose ?? "",
    frequency: prescription.frequency ?? "",
    route: prescription.route ?? "",
    prescribedBy: prescription.prescribed_by,
    sourceHospital: prescription.source_hospital ?? "",
    startDate: prescription.start_date ?? "",
  }
}

export function PrescriptionPanel({ patient }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PrescriptionFormState>(EMPTY_FORM)
  const [showInactive, setShowInactive] = useState(false)

  async function loadPrescriptions(includeInactive = showInactive) {
    setIsLoading(true)
    try {
      const data = await getPrescriptions(patient.id, !includeInactive)
      setPrescriptions(data)
      setError(null)
    } catch {
      setError("처방 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    void loadPrescriptions(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id])

  useEffect(() => {
    void loadPrescriptions(showInactive)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive])

  const activeCount = useMemo(
    () => prescriptions.filter((prescription) => prescription.is_active).length,
    [prescriptions],
  )

  function handleChange<K extends keyof PrescriptionFormState>(
    field: K,
    value: PrescriptionFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleEdit(prescription: Prescription) {
    setEditingId(prescription.id)
    setForm(toFormState(prescription))
    setError(null)
  }

  function handleReset() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSubmit() {
    const payload: PrescriptionCreate = {
      drug_name: form.drugName.trim() || undefined,
      ingredient_inn: form.ingredientInn.trim().toLowerCase() || undefined,
      dose: form.dose.trim() || undefined,
      frequency: form.frequency.trim() || undefined,
      route: form.route || undefined,
      prescribed_by: form.prescribedBy,
      source_hospital:
        form.prescribedBy === "타원" ? form.sourceHospital.trim() || undefined : undefined,
      start_date: form.startDate || undefined,
    }

    if (!payload.drug_name && !payload.ingredient_inn) {
      setError("약명 또는 INN명 중 하나는 입력해야 합니다.")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        await updatePrescription(editingId, payload)
      } else {
        await createPrescription(patient.id, payload)
      }
      handleReset()
      await loadPrescriptions(showInactive)
    } catch {
      setError("처방 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate(prescriptionId: string) {
    try {
      await deletePrescription(prescriptionId)
      await loadPrescriptions(showInactive)
    } catch {
      setError("처방 중단 처리에 실패했습니다.")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">활성 처방</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              현재 활성 처방 {activeCount}건
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((prev) => !prev)}
          >
            {showInactive ? "비활성 숨기기" : "비활성 포함"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">약명</label>
            <Input
              value={form.drugName}
              onChange={(e) => handleChange("drugName", e.target.value)}
              placeholder="예: Metformin 500mg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">INN명</label>
            <Input
              value={form.ingredientInn}
              onChange={(e) => handleChange("ingredientInn", e.target.value)}
              placeholder="예: metformin"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">용량</label>
            <Input
              value={form.dose}
              onChange={(e) => handleChange("dose", e.target.value)}
              placeholder="예: 500mg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">복용 빈도</label>
            <Input
              value={form.frequency}
              onChange={(e) => handleChange("frequency", e.target.value)}
              placeholder="예: BID"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">투여 경로</label>
            <select
              value={form.route}
              onChange={(e) => handleChange("route", e.target.value as DrugRoute | "")}
              className="w-full rounded border px-3 py-2 text-sm text-gray-900"
            >
              <option value="">선택 안 함</option>
              {ROUTE_OPTIONS.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">처방 출처</label>
            <select
              value={form.prescribedBy}
              onChange={(e) => handleChange("prescribedBy", e.target.value as PrescribedBy)}
              className="w-full rounded border px-3 py-2 text-sm text-gray-900"
            >
              {PRESCRIBED_BY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">처방 시작일</label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
            />
          </div>
          {form.prescribedBy === "타원" && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">외부 병원명</label>
              <Input
                value={form.sourceHospital}
                onChange={(e) => handleChange("sourceHospital", e.target.value)}
                placeholder="예: ○○병원"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          {editingId && (
            <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
              취소
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : editingId ? "처방 수정" : "처방 추가"}
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : prescriptions.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 처방이 없습니다.</p>
          ) : (
            prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className={`rounded border p-3 ${
                  prescription.is_active ? "bg-white" : "bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {prescription.drug_name ?? prescription.ingredient_inn ?? "미기재"}
                      </span>
                      {prescription.ingredient_inn && (
                        <Badge variant="secondary">{prescription.ingredient_inn}</Badge>
                      )}
                      <Badge variant={prescription.is_active ? "default" : "outline"}>
                        {prescription.is_active ? "활성" : "중단"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {[prescription.dose, prescription.frequency].filter(Boolean).join(" / ") || "용법 미기재"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {prescription.prescribed_by}
                      {prescription.source_hospital ? ` · ${prescription.source_hospital}` : ""}
                      {prescription.start_date ? ` · 시작 ${prescription.start_date}` : ""}
                      {prescription.end_date ? ` · 종료 ${prescription.end_date}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(prescription)}
                    >
                      수정
                    </Button>
                    {prescription.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(prescription.id)}
                      >
                        중단
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
