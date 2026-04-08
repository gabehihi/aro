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
} from "@/api/documents"

export function DocumentWriter() {
  const store = useDocumentStore()

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

  const handleSave = async () => {
    if (!store.selectedPatient || !store.docType || !store.generatedResult) return
    store.setIsSaving(true)
    try {
      await saveDocument({
        patient_id: store.selectedPatient.id,
        encounter_id: store.selectedEncounter?.id ?? null,
        doc_type: store.docType,
        title: `${store.docType} - ${store.selectedPatient.name}`,
        content: store.generatedResult.content,
        generated_text: store.editedText,
      })
      store.setError(null)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "저장 실패")
    } finally {
      store.setIsSaving(false)
    }
  }

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!store.generatedResult) return
    try {
      // For direct download without saved doc, we'd need a different approach
      // For now, save first then download
      const blob = new Blob([store.editedText], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${store.docType ?? "document"}.${format === "pdf" ? "pdf" : "docx"}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      store.setError("다운로드 실패")
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
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          onSave={handleSave}
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
        <DocumentHistory patientId={store.selectedPatient?.id ?? null} />
      </div>
    </div>
  )
}
