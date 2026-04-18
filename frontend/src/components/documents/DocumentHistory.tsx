import { useEffect, useState } from "react"
import { Clock, FileStack } from "lucide-react"
import { getDocuments } from "@/api/documents"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DocStatus, DocType, MedicalDocument } from "@/types"

interface Props {
  patientId: string | null
  refreshToken?: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  reviewed: "bg-blue-100 text-blue-700",
  issued: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  reviewed: "검토완료",
  issued: "발급완료",
}

const STATUS_OPTIONS: Array<{ value: DocStatus | "all"; label: string }> = [
  { value: "all", label: "전체 상태" },
  { value: "draft", label: "초안" },
  { value: "reviewed", label: "검토완료" },
  { value: "issued", label: "발급완료" },
]

const DOC_TYPE_OPTIONS: Array<{ value: DocType | "all"; label: string }> = [
  { value: "all", label: "전체 유형" },
  { value: "진단서", label: "진단서" },
  { value: "소견서", label: "소견서" },
  { value: "확인서", label: "진료확인서" },
  { value: "의뢰서", label: "진료의뢰서" },
  { value: "건강진단서", label: "건강진단서" },
  { value: "검사결과안내서", label: "검사결과안내서" },
  { value: "교육문서", label: "교육문서" },
]

export function DocumentHistory({ patientId, refreshToken = 0 }: Props) {
  const [issuedDocuments, setIssuedDocuments] = useState<MedicalDocument[]>([])
  const [archiveDocuments, setArchiveDocuments] = useState<MedicalDocument[]>([])
  const [issuedLoading, setIssuedLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveStatus, setArchiveStatus] = useState<DocStatus | "all">("all")
  const [archiveDocType, setArchiveDocType] = useState<DocType | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    if (!patientId) {
      setIssuedDocuments([])
      return
    }

    setIssuedLoading(true)
    getDocuments({
      patientId,
      page: 1,
      size: 10,
      status: "issued",
    })
      .then((res) => setIssuedDocuments(res.items))
      .catch(() => setIssuedDocuments([]))
      .finally(() => setIssuedLoading(false))
  }, [patientId, refreshToken])

  useEffect(() => {
    setArchiveLoading(true)
    getDocuments({
      patientId: patientId ?? undefined,
      page: 1,
      size: 20,
      status: archiveStatus === "all" ? undefined : archiveStatus,
      docType: archiveDocType === "all" ? undefined : archiveDocType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => setArchiveDocuments(res.items))
      .catch(() => setArchiveDocuments([]))
      .finally(() => setArchiveLoading(false))
  }, [archiveDocType, archiveStatus, dateFrom, dateTo, patientId, refreshToken])

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          문서 이력
        </CardTitle>
        <p className="text-xs text-gray-500">
          {patientId ? "선택 환자 기준 문서 이력" : "전체 문서 아카이브"}
        </p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs defaultValue="issued" className="gap-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="issued">발급 이력</TabsTrigger>
            <TabsTrigger value="archive">문서 아카이브</TabsTrigger>
          </TabsList>

          <TabsContent value="issued" className="space-y-2">
            {issuedLoading && <p className="text-xs text-gray-500">불러오는 중...</p>}
            {!issuedLoading && issuedDocuments.length === 0 && (
              <p className="text-xs text-gray-400">
                {patientId ? "발급 완료 문서가 없습니다." : "환자를 선택하면 발급 이력을 볼 수 있습니다."}
              </p>
            )}
            <div className="space-y-2">
              {issuedDocuments.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} showIssuedAt />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="archive" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={archiveStatus}
                onChange={(e) => setArchiveStatus(e.target.value as DocStatus | "all")}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={archiveDocType}
                onChange={(e) => setArchiveDocType(e.target.value as DocType | "all")}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {DOC_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {archiveLoading && <p className="text-xs text-gray-500">불러오는 중...</p>}
            {!archiveLoading && archiveDocuments.length === 0 && (
              <p className="text-xs text-gray-400">
                조건에 맞는 문서가 없습니다.
              </p>
            )}
            <div className="space-y-2">
              {archiveDocuments.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function DocumentRow({
  doc,
  showIssuedAt = false,
}: {
  doc: MedicalDocument
  showIssuedAt?: boolean
}) {
  const dateLabel =
    showIssuedAt && doc.issued_at
      ? new Date(doc.issued_at).toLocaleDateString("ko-KR")
      : new Date(doc.created_at).toLocaleDateString("ko-KR")

  const metaLabel =
    showIssuedAt && doc.issued_at
      ? `발급일 ${dateLabel}`
      : `저장일 ${dateLabel}`

  return (
    <div className="flex items-center justify-between rounded border p-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="text-xs text-gray-500">
          {doc.doc_type} | {metaLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={STATUS_COLORS[doc.status] ?? ""}>
          {STATUS_LABELS[doc.status] ?? doc.status}
        </Badge>
        <FileStack className="h-3.5 w-3.5 text-gray-400" />
      </div>
    </div>
  )
}
