import { PatientSearchBar } from "@/components/soap/PatientSearchBar"
import { PatientSummaryCard } from "@/components/soap/PatientSummaryCard"
import { RawInputForm } from "@/components/soap/RawInputForm"
import { SickDayAlertBanner } from "@/components/soap/SickDayAlert"
import { WarningBanner } from "@/components/soap/WarningBanner"
import { SOAPResultPanel } from "@/components/soap/SOAPResultPanel"
import { VitalsCard } from "@/components/soap/VitalsCard"
import { KCDCodeList } from "@/components/soap/KCDCodeList"
import { HealthPromotionTags } from "@/components/soap/HealthPromotionTags"
import { SaveEncounterButton } from "@/components/soap/SaveEncounterButton"
import { LLMMetaInfo } from "@/components/soap/LLMMetaInfo"
import { ClinicalDashboard } from "@/components/soap/ClinicalDashboard"
import { useSoapStore } from "@/hooks/useSoapStore"

export function SOAPWriter() {
  const { selectedPatient, soapResult, error } = useSoapStore()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">SOAP 작성</h1>

      <PatientSearchBar />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left panel (60%) */}
        <div className="space-y-4 lg:col-span-3">
          <PatientSummaryCard />
          <RawInputForm />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {soapResult && (
            <div className="space-y-4">
              <SickDayAlertBanner />
              <WarningBanner />
              <SOAPResultPanel />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <VitalsCard />
                <KCDCodeList />
                <HealthPromotionTags />
              </div>

              <LLMMetaInfo />
              <SaveEncounterButton />
            </div>
          )}
        </div>

        {/* Right panel (40%) - Clinical Dashboard */}
        {selectedPatient && (
          <div className="lg:col-span-2">
            <ClinicalDashboard />
          </div>
        )}
      </div>
    </div>
  )
}
