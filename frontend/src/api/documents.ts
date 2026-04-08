import api from "@/lib/api"
import type {
  DocumentGenerateRequest,
  DocumentGenerateResponse,
  DocumentSaveRequest,
  DocumentUpdateRequest,
  MedicalDocument,
  DocumentListResponse,
  DocType,
} from "@/types"

export async function generateDocument(
  body: DocumentGenerateRequest,
): Promise<DocumentGenerateResponse> {
  const { data } = await api.post<DocumentGenerateResponse>(
    "/documents/generate",
    body,
  )
  return data
}

export async function getSourceData(
  patientId: string,
  encounterId: string | null,
  docType: DocType,
): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(
    "/documents/source-data",
    { patient_id: patientId, encounter_id: encounterId, doc_type: docType },
  )
  return data
}

export async function saveDocument(
  body: DocumentSaveRequest,
): Promise<MedicalDocument> {
  const { data } = await api.post<MedicalDocument>("/documents", body)
  return data
}

export async function getDocuments(
  patientId?: string,
  page = 1,
  size = 20,
): Promise<DocumentListResponse> {
  const { data } = await api.get<DocumentListResponse>("/documents", {
    params: { patient_id: patientId, page, size },
  })
  return data
}

export async function getDocument(id: string): Promise<MedicalDocument> {
  const { data } = await api.get<MedicalDocument>(`/documents/${id}`)
  return data
}

export async function updateDocument(
  id: string,
  body: DocumentUpdateRequest,
): Promise<MedicalDocument> {
  const { data } = await api.put<MedicalDocument>(`/documents/${id}`, body)
  return data
}

export async function issueDocument(id: string): Promise<MedicalDocument> {
  const { data } = await api.post<MedicalDocument>(`/documents/${id}/issue`)
  return data
}

export async function downloadDocument(
  id: string,
  format: "pdf" | "docx",
): Promise<Blob> {
  const { data } = await api.get(`/documents/${id}/download`, {
    params: { format },
    responseType: "blob",
  })
  return data
}
