import { Button } from "@/components/ui/button"
import { Download, FileCheck, Loader2, Save, Sparkles } from "lucide-react"

interface Props {
  hasResult: boolean
  hasUnresolvedErrors: boolean
  isGenerating: boolean
  isSaving: boolean
  canGenerate: boolean
  onGenerate: () => void
  onSave: () => void
  onDownloadPdf: () => void
  onDownloadDocx: () => void
}

export function DocumentActions({
  hasResult,
  hasUnresolvedErrors,
  isGenerating,
  isSaving,
  canGenerate,
  onGenerate,
  onSave,
  onDownloadPdf,
  onDownloadDocx,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isGenerating ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-1 h-4 w-4" />
        )}
        {isGenerating ? "생성 중..." : "AI 문서 생성"}
      </Button>

      {hasResult && (
        <>
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="outline"
          >
            {isSaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            초안 저장
          </Button>

          <Button
            onClick={onDownloadPdf}
            variant="outline"
            disabled={hasUnresolvedErrors}
            title={hasUnresolvedErrors ? "오류 해결 후 다운로드 가능" : ""}
          >
            <Download className="mr-1 h-4 w-4" />
            PDF
          </Button>

          <Button onClick={onDownloadDocx} variant="outline">
            <FileCheck className="mr-1 h-4 w-4" />
            DOCX
          </Button>
        </>
      )}
    </div>
  )
}
