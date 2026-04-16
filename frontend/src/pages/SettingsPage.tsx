import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

const STORAGE_KEY = "aro_settings"

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
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch {
        // 파싱 실패 시 기본값 유지
      }
    }
  }, [])

  function handleChange(field: keyof ClinicSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            <Button onClick={handleSave}>
              {saved ? "저장되었습니다 ✓" : "저장"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">
                설정이 저장되었습니다.
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 pt-1">
            이 설정은 브라우저 로컬 저장소에 저장됩니다. 의원명은 문서 발급
            시 사용됩니다.
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
