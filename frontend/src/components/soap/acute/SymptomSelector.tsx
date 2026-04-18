import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoapStore } from "@/hooks/useSoapStore"
import { SYMPTOM_CATEGORIES } from "@/utils/soap/types"
import { groupSymptomsByCategory } from "@/utils/soap/symptoms"

export function SymptomSelector() {
  const toggles = useSoapStore((s) => s.acute.toggles)
  const ccSymptomId = useSoapStore((s) => s.acute.ccSymptomId)
  const toggleSymptom = useSoapStore((s) => s.toggleSymptom)
  const clearSymptom = useSoapStore((s) => s.clearSymptom)
  const setCC = useSoapStore((s) => s.setCC)

  const grouped = groupSymptomsByCategory()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">증상 토글 (CC 지정)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {SYMPTOM_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="mb-1 text-xs font-medium text-gray-600">{cat}</div>
              <div className="grid grid-cols-4 gap-1.5">
                {grouped[cat].map((sym) => {
                  const current = toggles.find((t) => t.symptomId === sym.id)
                  const isCC = ccSymptomId === sym.id
                  return (
                    <div
                      key={sym.id}
                      className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs ${
                        current
                          ? isCC
                            ? "border-primary bg-primary/5"
                            : "border-input bg-background"
                          : "border-input bg-background"
                      }`}
                    >
                      <span className="truncate">{sym.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleSymptom(sym.id, "+")}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                            current?.sign === "+"
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                          title="증상 (+)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSymptom(sym.id, "-")}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                            current?.sign === "-"
                              ? "bg-gray-700 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                          title="부정 (-)"
                        >
                          −
                        </button>
                        {current?.sign === "+" ? (
                          <button
                            type="button"
                            onClick={() => setCC(isCC ? null : sym.id)}
                            className={`ml-0.5 inline-flex h-5 items-center rounded px-1 text-[10px] font-medium ${
                              isCC
                                ? "bg-amber-500 text-white"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                            title="주요 호소(CC)로 지정"
                          >
                            CC
                          </button>
                        ) : null}
                        {current ? (
                          <button
                            type="button"
                            onClick={() => clearSymptom(sym.id)}
                            className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-600"
                            title="제거"
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
