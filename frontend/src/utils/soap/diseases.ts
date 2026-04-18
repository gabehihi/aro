import type { DiseaseId, DiseaseMeta } from "./types"
import { DISEASE_IDS } from "./types"

export const DISEASES: Record<DiseaseId, DiseaseMeta> = {
  HTN: {
    id: "HTN",
    label: "고혈압",
    shortLabel: "HTN",
    kcdCode: "I10",
    kcdDescription: "본태성(원발성) 고혈압",
  },
  DM: {
    id: "DM",
    label: "당뇨병",
    shortLabel: "DM",
    kcdCode: "E11.9",
    kcdDescription: "2형 당뇨병, 합병증을 동반하지 않은",
  },
  DL: {
    id: "DL",
    label: "이상지질혈증",
    shortLabel: "Dyslipidemia",
    kcdCode: "E78.5",
    kcdDescription: "고지질혈증, 상세불명의",
  },
  OB: {
    id: "OB",
    label: "비만",
    shortLabel: "Obesity",
    kcdCode: "E66.9",
    kcdDescription: "비만, 상세불명의",
  },
  MASLD: {
    id: "MASLD",
    label: "대사연관지방간질환",
    shortLabel: "MASLD",
    kcdCode: "K76.0",
    kcdDescription: "지방(변성) 간, 달리 분류되지 않은",
  },
  OP: {
    id: "OP",
    label: "골다공증",
    shortLabel: "Osteoporosis",
    kcdCode: "M81.9",
    kcdDescription: "상세불명의 골다공증",
  },
  CKD: {
    id: "CKD",
    label: "만성콩팥병",
    shortLabel: "CKD",
    kcdCode: "N18.9",
    kcdDescription: "만성 콩팥기능상실, 상세불명의",
  },
  HypoT: {
    id: "HypoT",
    label: "갑상선기능저하증",
    shortLabel: "Hypothyroidism",
    kcdCode: "E03.9",
    kcdDescription: "상세불명의 갑상선기능저하증",
  },
  HyperT: {
    id: "HyperT",
    label: "갑상선기능항진증",
    shortLabel: "Hyperthyroidism",
    kcdCode: "E05.9",
    kcdDescription: "상세불명의 갑상선중독증",
  },
}

export const DISEASE_ORDER: DiseaseId[] = [...DISEASE_IDS]

export function getDiseaseLabel(id: DiseaseId): string {
  return DISEASES[id].label
}

export function getKCDCode(id: DiseaseId): { code: string; description: string } {
  return {
    code: DISEASES[id].kcdCode,
    description: DISEASES[id].kcdDescription,
  }
}

// 갑상선은 Hypo/Hyper 상호 배타 — DiseasePicker에서 처리
export function isThyroidId(id: DiseaseId): boolean {
  return id === "HypoT" || id === "HyperT"
}
