import { Button } from "@/components/ui/button"
import { CheckCheck, Download, FileCheck, Loader2, Save, Send, Sparkles } from "lucide-react"
import type { DocStatus } from "@/types"

interface Props {
  hasResult: boolean
  hasUnresolvedErrors: boolean
  isGenerating: boolean
  isSaving: boolean
  isIssuing: boolean
  canGenerate: boolean
  status: DocStatus | null
  onGenerate: () => void
  onSave: () => void
  onMarkReviewed: () => void
  onIssue: () => void
  onDownloadPdf: () => void
  onDownloadDocx: () => void
}

export function DocumentActions({
  hasResult,
  hasUnresolvedErrors,
  isGenerating,
  isSaving,
  isIssuing,
  canGenerate,
  status,
  onGenerate,
  onSave,
  onMarkReviewed,
  onIssue,
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
            onClick={onMarkReviewed}
            disabled={isSaving || isIssuing || hasUnresolvedErrors}
            variant="outline"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            {status === "reviewed" || status === "issued" ? "검토 완료" : "검토 완료 처리"}
          </Button>

          <Button
            onClick={onIssue}
            disabled={isSaving || isIssuing || hasUnresolvedErrors || status === "issued"}
          >
            {isIssuing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            {status === "issued" ? "발급 완료" : "발급 처리"}
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
