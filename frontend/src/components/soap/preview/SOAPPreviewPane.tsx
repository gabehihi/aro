import { ExternalLink, RotateCcw, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSoapStore } from "@/hooks/useSoapStore"
import { useComposedSoap } from "@/hooks/useSoapSelectors"
import { formatSoapForCopy } from "@/utils/soap/soapFormatter"
import type { SoapSectionKey } from "@/hooks/useSoapStore"
import { CopyButton } from "./CopyButton"

const SECTION_ORDER: { key: SoapSectionKey; header: string }[] = [
  { key: "s", header: "S) Subjective" },
  { key: "o", header: "O) Objective" },
  { key: "a", header: "A) Assessment" },
  { key: "p", header: "P) Plan" },
]

function cloneStylesToPopup(targetDocument: Document) {
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    targetDocument.head.appendChild(node.cloneNode(true))
  }

  const popupStyle = targetDocument.createElement("style")
  popupStyle.textContent = `
    html, body {
      min-height: 100%;
      margin: 0;
      background: #f8fafc;
    }

    body {
      padding: 16px;
    }

    #soap-preview-root {
      min-height: calc(100vh - 32px);
    }
  `
  targetDocument.head.appendChild(popupStyle)
}

function SOAPPreviewEditor({ onClose }: { onClose: () => void }) {
  const manualOverrides = useSoapStore((s) => s.manualOverrides)
  const setManualOverride = useSoapStore((s) => s.setManualOverride)
  const clearManualOverride = useSoapStore((s) => s.clearManualOverride)
  const clearAllOverrides = useSoapStore((s) => s.clearAllOverrides)
  const composed = useComposedSoap()
  const fullText = formatSoapForCopy(composed)
  const hasAnyOverride = Object.keys(manualOverrides).length > 0

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">SOAP 복붙 창</CardTitle>
          <CardDescription>섹션별 수정과 복사를 이 창에서 진행합니다.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {hasAnyOverride ? (
            <Button variant="ghost" size="xs" onClick={clearAllOverrides}>
              <RotateCcw className="h-3 w-3" />
              전체 되돌리기
            </Button>
          ) : null}
          <CopyButton text={fullText} label="전체 복사" />
          <Button variant="ghost" size="xs" onClick={onClose}>
            <X className="h-3 w-3" />
            창 닫기
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SECTION_ORDER.map(({ key, header }) => {
          const value = composed[key]
          const isOverridden = key in manualOverrides
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{header}</span>
                  {isOverridden ? (
                    <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      수기편집
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {isOverridden ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => clearManualOverride(key)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      되돌리기
                    </Button>
                  ) : null}
                  <CopyButton text={value} size="xs" label="섹션 복사" />
                </div>
              </div>
              <textarea
                value={value}
                onChange={(e) => setManualOverride(key, e.target.value)}
                className="max-h-48 w-full resize-y overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
                rows={6}
                spellCheck={false}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

interface SOAPPreviewPaneProps {
  onRegisterOpener?: (openFn: () => void) => void
}

export function SOAPPreviewPane({ onRegisterOpener }: SOAPPreviewPaneProps) {
  const popupRef = useRef<Window | null>(null)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const fullText = formatSoapForCopy(useComposedSoap())

  const handlePopupClosed = useCallback(() => {
    popupRef.current = null
    setPortalHost(null)
  }, [])

  const closePopup = useCallback(() => {
    const popup = popupRef.current
    handlePopupClosed()
    if (popup && !popup.closed) {
      popup.removeEventListener("beforeunload", handlePopupClosed)
      popup.close()
    }
  }, [handlePopupClosed])

  const openPopup = useCallback(() => {
    setPopupBlocked(false)

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus()
      return
    }

    const popup = window.open("", "soap-preview-window", "width=1100,height=920")
    if (!popup) {
      setPopupBlocked(true)
      return
    }

    popup.document.title = "SOAP 복붙"
    popup.document.body.innerHTML = ""
    cloneStylesToPopup(popup.document)

    const host = popup.document.createElement("div")
    host.id = "soap-preview-root"
    popup.document.body.appendChild(host)

    popup.addEventListener("beforeunload", handlePopupClosed, { once: true })
    popupRef.current = popup
    setPortalHost(host)
    popup.focus()
  }, [handlePopupClosed])

  useEffect(() => {
    onRegisterOpener?.(openPopup)
  }, [onRegisterOpener, openPopup])

  useEffect(() => {
    return () => {
      closePopup()
    }
  }, [closePopup])

  const isOpen = !!popupRef.current && !popupRef.current.closed && !!portalHost

  return (
    <>
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-base">SOAP 복붙 창</CardTitle>
          <CardDescription>
            메인 화면에서는 입력에 집중하고, 복사와 수기 수정은 새 창에서 진행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={openPopup}>
              <ExternalLink className="h-3.5 w-3.5" />
              {isOpen ? "복붙 창으로 이동" : "복붙 창 열기"}
            </Button>
            <CopyButton text={fullText} label="전체 즉시 복사" />
          </div>
          <p className="text-xs text-muted-foreground">
            새 창은 현재 SOAP 상태와 실시간으로 연결됩니다.
          </p>
          {popupBlocked ? (
            <p className="text-xs text-destructive">
              팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해 주세요.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {portalHost ? createPortal(<SOAPPreviewEditor onClose={closePopup} />, portalHost) : null}
    </>
  )
}
