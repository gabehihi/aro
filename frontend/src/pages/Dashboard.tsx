import { useEffect, useState, type ElementType } from "react"
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileOutput,
  UserRoundCheck,
} from "lucide-react"
import { getDashboardSummary } from "@/api/dashboard"
import { downloadArchivedReport, downloadMonthlyReport } from "@/api/reports"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import type {
  DashboardOverviewResponse,
  FollowUpAlertItem,
  MonthlyReportArchiveItem,
  RecentDocumentSummary,
  VisitScheduleItem,
} from "@/types"

const priorityBadge: Record<string, "destructive" | "secondary" | "outline"> = {
  urgent: "destructive",
  due: "secondary",
  upcoming: "outline",
}

const priorityLabel: Record<string, string> = {
  urgent: "즉시",
  due: "기한 임박",
  upcoming: "예정",
}

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardOverviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [downloadKey, setDownloadKey] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    getDashboardSummary()
      .then((response) => {
        setData(response)
        setError(null)
      })
      .catch(() => setError("대시보드 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleDownloadCurrentMonth() {
    if (!data) return
    const key = `current-${data.month_stats.year}-${data.month_stats.month}`
    setDownloadKey(key)
    try {
      const blob = await downloadMonthlyReport(data.month_stats.year, data.month_stats.month)
      triggerBlobDownload(
        blob,
        `monthly_report_${data.month_stats.year}${String(data.month_stats.month).padStart(2, "0")}.pdf`,
      )
    } finally {
      setDownloadKey(null)
    }
  }

  async function handleDownloadArchive(item: MonthlyReportArchiveItem) {
    const key = `${item.year}-${item.month}`
    setDownloadKey(key)
    try {
      const blob = await downloadArchivedReport(item.year, item.month)
      triggerBlobDownload(blob, item.filename)
    } finally {
      setDownloadKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        대시보드 로딩 중...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            {error ?? "대시보드 데이터를 불러오지 못했습니다."}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name}님, {user?.clinic_name || "보건소"}의 오늘 운영 현황입니다.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadCurrentMonth}
          disabled={downloadKey !== null}
        >
          <Download className="h-4 w-4" />
          이번달 PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="오늘 예약"
          value={data.summary.today_appointments}
          icon={CalendarDays}
          tone="emerald"
        />
        <MetricCard
          title="F/U 필요"
          value={data.summary.followup_needed}
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          title="미내원 (지난주)"
          value={data.summary.noshow_last_week}
          icon={UserRoundCheck}
          tone="rose"
        />
        <MetricCard
          title="검진 미수검"
          value={data.summary.screening_incomplete}
          icon={ClipboardCheck}
          tone="sky"
        />
      </div>

      <Card className="border-border/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">이번달 활동 요약</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="내원 기록"
            value={`${data.month_stats.encounters_this_month}건`}
            hint={`누적 ${data.month_stats.total_encounters}건`}
            icon={Activity}
          />
          <MiniStat
            label="문서 발급"
            value={`${data.month_stats.documents_issued_this_month}건`}
            hint="issued 기준"
            icon={FileOutput}
          />
          <MiniStat
            label="검진 등록"
            value={`${data.month_stats.screenings_this_month}건`}
            hint={`이상소견 ${data.month_stats.abnormal_screenings}건`}
            icon={ClipboardCheck}
          />
          <MiniStat
            label="F/U 해결률"
            value={`${data.month_stats.followup_resolution_rate}%`}
            hint={`${data.month_stats.followup_resolved_this_month}/${data.month_stats.followup_alerts_this_month}건 해결`}
            icon={AlertTriangle}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">예정 내원</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcoming_visits.length === 0 && (
              <EmptyLine text="예정된 내원이 없습니다." />
            )}
            {data.upcoming_visits.map((visit) => (
              <VisitRow key={visit.id} visit={visit} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">우선 확인 F/U</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.priority_followup_alerts.length === 0 && (
              <EmptyLine text="처리할 F/U 알림이 없습니다." />
            )}
            {data.priority_followup_alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 문서</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_documents.length === 0 && (
              <EmptyLine text="저장된 문서가 없습니다." />
            )}
            {data.recent_documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">월간 보고서 아카이브</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.report_archive.length === 0 && (
              <EmptyLine text="저장된 월간 보고서가 없습니다." />
            )}
            {data.report_archive.map((report) => (
              <ReportRow
                key={report.filename}
                report={report}
                isDownloading={downloadKey === `${report.year}-${report.month}`}
                onDownload={() => handleDownloadArchive(report)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: number
  icon: ElementType
  tone: "emerald" | "amber" | "rose" | "sky"
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    rose: "bg-rose-500/10 text-rose-700",
    sky: "bg-sky-500/10 text-sky-700",
  }[tone]

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-xl p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  icon: ElementType
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function VisitRow({ visit }: { visit: VisitScheduleItem }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-border/70 p-4">
      <div className="space-y-1">
        <p className="font-medium">
          {visit.patient_name}
          <span className="ml-2 text-xs text-muted-foreground">({visit.chart_no})</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {visit.scheduled_date}
          {visit.planned_tests.length > 0 && ` · ${visit.planned_tests.join(", ")}`}
        </p>
      </div>
      {visit.needs_fasting && <Badge variant="outline">금식</Badge>}
    </div>
  )
}

function AlertRow({ alert }: { alert: FollowUpAlertItem }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-border/70 p-4">
      <div className="space-y-1">
        <p className="font-medium">
          {alert.patient_name}
          <span className="ml-2 text-xs text-muted-foreground">({alert.chart_no})</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {alert.item}
          {alert.last_value ? ` ${alert.last_value}` : ""} · {alert.due_date}
        </p>
      </div>
      <Badge variant={priorityBadge[alert.priority] ?? "outline"}>
        {priorityLabel[alert.priority] ?? alert.priority}
      </Badge>
    </div>
  )
}

function DocumentRow({ doc }: { doc: RecentDocumentSummary }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-border/70 p-4">
      <div className="space-y-1">
        <p className="font-medium">{doc.title}</p>
        <p className="text-sm text-muted-foreground">
          {doc.patient_name} ({doc.chart_no}) · {doc.doc_type}
        </p>
        <p className="text-xs text-muted-foreground">
          저장 {doc.created_at.slice(0, 10)}
          {doc.issued_at && ` · 발급 ${doc.issued_at.slice(0, 10)}`}
        </p>
      </div>
      <Badge variant={doc.status === "issued" ? "default" : doc.status === "reviewed" ? "secondary" : "outline"}>
        {doc.status}
      </Badge>
    </div>
  )
}

function ReportRow({
  report,
  isDownloading,
  onDownload,
}: {
  report: MonthlyReportArchiveItem
  isDownloading: boolean
  onDownload: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
      <div className="space-y-1">
        <p className="font-medium">
          {report.year}년 {report.month}월 보고서
        </p>
        <p className="text-sm text-muted-foreground">
          {report.generated_at.slice(0, 10)} · {formatFileSize(report.size_bytes)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onDownload} disabled={isDownloading}>
        <Download className="h-4 w-4" />
        다운로드
      </Button>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
