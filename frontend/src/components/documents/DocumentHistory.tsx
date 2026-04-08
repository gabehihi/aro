import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { getDocuments } from "@/api/documents"
import type { MedicalDocument } from "@/types"

interface Props {
  patientId: string | null
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

export function DocumentHistory({ patientId }: Props) {
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!patientId) {
      setDocuments([])
      return
    }
    setLoading(true)
    getDocuments(patientId, 1, 10)
      .then((res) => setDocuments(res.items))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }, [patientId])

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          발급 이력
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading && <p className="text-xs text-gray-500">불러오는 중...</p>}
        {!loading && documents.length === 0 && (
          <p className="text-xs text-gray-400">
            {patientId ? "발급된 문서가 없습니다." : "환자를 선택하세요."}
          </p>
        )}
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded border p-2"
            >
              <div>
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-gray-500">
                  {doc.doc_type} | {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <Badge className={STATUS_COLORS[doc.status] ?? ""}>
                {STATUS_LABELS[doc.status] ?? doc.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
