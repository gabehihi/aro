import { useSoapStore } from "@/hooks/useSoapStore"
import type { DiseaseId } from "@/utils/soap/types"
import { DISEASE_ORDER } from "@/utils/soap/diseases"
import { HTNSection } from "./HTNSection"
import { DMSection } from "./DMSection"
import { DLSection } from "./DLSection"
import { ObesitySection } from "./ObesitySection"
import { MASLDSection } from "./MASLDSection"
import { OsteoporosisSection } from "./OsteoporosisSection"
import { CKDSection } from "./CKDSection"
import { ThyroidSection } from "./ThyroidSection"

function renderSection(id: DiseaseId) {
  switch (id) {
    case "HTN":
      return <HTNSection key="HTN" />
    case "DM":
      return <DMSection key="DM" />
    case "DL":
      return <DLSection key="DL" />
    case "OB":
      return <ObesitySection key="OB" />
    case "MASLD":
      return <MASLDSection key="MASLD" />
    case "OP":
      return <OsteoporosisSection key="OP" />
    case "CKD":
      return <CKDSection key="CKD" />
    case "HypoT":
      return <ThyroidSection key="HypoT" variant="HypoT" />
    case "HyperT":
      return <ThyroidSection key="HyperT" variant="HyperT" />
    default:
      return null
  }
}

export function DiseaseSections() {
  const selected = useSoapStore((s) => s.chronic.selectedDiseases)
  const activeDisease = useSoapStore((s) => s.activeChronicDisease)
  if (selected.length === 0) return null
  const current =
    (activeDisease && selected.includes(activeDisease) ? activeDisease : null) ??
    DISEASE_ORDER.find((d) => selected.includes(d))

  if (!current) return null

  return <div className="space-y-3">{renderSection(current)}</div>
}
