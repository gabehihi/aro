import { useEffect, useState } from "react"
import { useDocumentStore } from "@/hooks/useDocumentStore"
import { PatientSelector } from "@/components/documents/PatientSelector"
import { DocumentTypeSelector } from "@/components/documents/DocumentTypeSelector"
import { SourceDataPreview } from "@/components/documents/SourceDataPreview"
import { DocumentPreview } from "@/components/documents/DocumentPreview"
import { DocumentEditor } from "@/components/documents/DocumentEditor"
import { DocumentWarningPanel } from "@/components/documents/DocumentWarningPanel"
import { DocumentActions } from "@/components/documents/DocumentActions"
import { DocumentHistory } from "@/components/documents/DocumentHistory"
import {
  generateDocument,
  getSourceData,
  saveDocument,
  downloadDocument,
  issueDocument,
  updateDocument,
} from "@/api/documents"
import type { MedicalDocument } from "@/types"

export function DocumentWriter() {
  const store = useDocumentStore()
  const [savedDocument, setSavedDocument] = useState<MedicalDocument | null>(null)
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)

  useEffect(() => {
    setSavedDocument(null)
  }, [store.selectedPatient?.id, store.docType, store.editedText])

  const canGenerate =
    !!store.selectedPatient && !!store.docType && !store.isGenerating

  const handleGenerate = async () => {
    if (!store.selectedPatient || !store.docType) return
    store.setIsGenerating(true)
    store.setError(null)
    try {
      const sourceData = await getSourceData(
        store.selectedPatient.id,
        store.selectedEncounter?.id ?? null,
        store.docType,
      )
      store.setSourceData(sourceData)

      const result = await generateDocument({
        patient_id: store.selectedPatient.id,
        encounter_id: store.selectedEncounter?.id ?? null,
        doc_type: store.docType,
      })
      store.setGeneratedResult(result)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "문서 생성 실패")
    } finally {
      store.setIsGenerating(false)
    }
  }

  const handleSave = async (): Promise<MedicalDocument | null> => {
    if (!store.selectedPatient || !store.docType || !store.generatedResult) return null
    store.setIsSaving(true)
    try {
      const saved = await saveDocument({
        patient_id: store.selectedPatient.id,
        encounter_id: store.selectedEncounter?.id ?? null,
        doc_type: store.docType,
        title: `${store.docType} - ${store.selectedPatient.name}`,
        content: store.generatedResult.content,
        generated_text: store.editedText,
      })
      setSavedDocument(saved)
      setHistoryRefreshToken((prev) => prev + 1)
      store.setError(null)
      return saved
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "저장 실패")
      return null
    } finally {
      store.setIsSaving(false)
    }
  }

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!store.generatedResult) return
    try {
      let documentId = savedDocument?.id ?? null
      if (!documentId) {
        const saved = await handleSave()
        documentId = saved?.id ?? null
      }
      if (!documentId) return

      const blob = await downloadDocument(documentId, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${store.docType ?? "document"}.${format === "pdf" ? "pdf" : "docx"}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "다운로드 실패")
    }
  }

  const handleMarkReviewed = async () => {
    if (!store.generatedResult) return
    store.setIsIssuing(true)
    try {
      const ensured = savedDocument ?? (await handleSave())
      if (!ensured) return

      if (ensured.status === "reviewed" || ensured.status === "issued") {
        setSavedDocument(ensured)
        return
      }

      const updated = await updateDocument(ensured.id, {
        generated_text: store.editedText,
        status: "reviewed",
      })
      setSavedDocument(updated)
      setHistoryRefreshToken((prev) => prev + 1)
      store.setError(null)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "검토 완료 처리 실패")
    } finally {
      store.setIsIssuing(false)
    }
  }

  const handleIssue = async () => {
    if (!store.generatedResult) return
    store.setIsIssuing(true)
    try {
      let ensured = savedDocument ?? (await handleSave())
      if (!ensured) return

      if (ensured.status === "draft") {
        ensured = await updateDocument(ensured.id, {
          generated_text: store.editedText,
          status: "reviewed",
        })
      }

      if (ensured.status !== "issued") {
        ensured = await issueDocument(ensured.id)
      }

      setSavedDocument(ensured)
      setHistoryRefreshToken((prev) => prev + 1)
      store.setError(null)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "문서 발급 실패")
    } finally {
      store.setIsIssuing(false)
    }
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left panel (60%) */}
      <div className="flex w-3/5 flex-col gap-4 overflow-y-auto">
        <h1 className="text-lg font-bold">문서 발급</h1>

        <PatientSelector
          selected={store.selectedPatient}
          onSelect={store.setSelectedPatient}
        />

        <DocumentTypeSelector
          selected={store.docType}
          onSelect={store.setDocType}
        />

        {store.error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {store.error}
          </div>
        )}

        <DocumentActions
          hasResult={!!store.generatedResult}
          hasUnresolvedErrors={store.generatedResult?.has_unresolved_errors ?? false}
          isGenerating={store.isGenerating}
          isSaving={store.isSaving}
          isIssuing={store.isIssuing}
          canGenerate={canGenerate}
          status={savedDocument?.status ?? null}
          onGenerate={handleGenerate}
          onSave={handleSave}
          onMarkReviewed={handleMarkReviewed}
          onIssue={handleIssue}
          onDownloadPdf={() => handleDownload("pdf")}
          onDownloadDocx={() => handleDownload("docx")}
        />

        <SourceDataPreview sourceData={store.sourceData} />

        {store.generatedResult && (
          <>
            <DocumentWarningPanel warnings={store.generatedResult.warnings} />
            <DocumentPreview
              generatedText={store.editedText}
              warnings={store.generatedResult.warnings}
            />
            <DocumentEditor
              value={store.editedText}
              onChange={store.setEditedText}
            />
          </>
        )}
      </div>

      {/* Right panel (40%) */}
      <div className="w-2/5 overflow-y-auto">
        <DocumentHistory
          patientId={store.selectedPatient?.id ?? null}
          refreshToken={historyRefreshToken}
        />
      </div>
    </div>
  )
}
