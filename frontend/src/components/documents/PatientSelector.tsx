import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { getPatients } from "@/api/patients"
import { Input } from "@/components/ui/input"
import type { Patient } from "@/types"

interface Props {
  selected: Patient | null
  onSelect: (patient: Patient | null) => void
}

export function PatientSelector({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await getPatients(query, 1, 8)
        setResults(res.items)
        setIsOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded border bg-blue-50 p-2">
        <span className="text-sm font-medium">
          {selected.name} ({selected.chart_no})
        </span>
        <span className="text-xs text-gray-500">
          {selected.birth_date} | {selected.sex}
        </span>
        <button
          onClick={() => {
            onSelect(null)
            setQuery("")
          }}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="환자 검색 (이름, 차트번호)"
          className="pl-8"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onSelect(p)
                setIsOpen(false)
                setQuery("")
              }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-gray-500">
                {p.chart_no} | {p.birth_date}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
