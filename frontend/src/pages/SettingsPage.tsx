import { useEffect, useState } from "react"
import { updateMe } from "@/api/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

interface ClinicSettings {
  clinicName: string
  doctorName: string
  clinicAddress: string
  clinicPhone: string
}

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "",
  doctorName: "",
  clinicAddress: "",
  clinicPhone: "",
}

export default function SettingsPage() {
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS)
      return
    }
    setSettings({
      clinicName: user.clinic_name ?? "",
      doctorName: user.name ?? "",
      clinicAddress: user.clinic_address ?? "",
      clinicPhone: user.clinic_phone ?? "",
    })
  }, [user])

  function handleChange(field: keyof ClinicSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSave() {
    if (!user) return

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateMe({
        name: settings.doctorName.trim(),
        clinic_name: settings.clinicName.trim() || undefined,
        clinic_address: settings.clinicAddress.trim() || undefined,
        clinic_phone: settings.clinicPhone.trim() || undefined,
      })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("설정을 저장하지 못했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* 의원 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">의원 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              의원/보건소 이름
            </label>
            <Input
              value={settings.clinicName}
              onChange={handleChange("clinicName")}
              placeholder="예: ○○보건지소"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              의사 이름
            </label>
            <Input
              value={settings.doctorName}
              onChange={handleChange("doctorName")}
              placeholder="예: 홍길동"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">주소</label>
            <Input
              value={settings.clinicAddress}
              onChange={handleChange("clinicAddress")}
              placeholder="예: 충청북도 ○○시 ○○로 1"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              대표 전화번호
            </label>
            <Input
              value={settings.clinicPhone}
              onChange={handleChange("clinicPhone")}
              placeholder="예: 043-000-0000"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "저장 중..." : saved ? "저장되었습니다 ✓" : "저장"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">
                설정이 저장되었습니다.
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 pt-1">
            이 설정은 현재 로그인한 계정에 저장되며, 보고서와 문서 기본 정보에
            사용됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              로그인 아이디
            </label>
            <Input
              value={user?.username ?? ""}
              readOnly
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-gray-500">
            계정 정보는 읽기 전용입니다. 변경이 필요한 경우 시스템 관리자에게
            문의하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
