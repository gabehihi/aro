import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { getPatients } from "@/api/patients"
import { Input } from "@/components/ui/input"
import { useSoapStore } from "@/hooks/useSoapStore"
import type { Patient } from "@/types"

export function PatientSearchBar() {
  const { selectedPatient, setSelectedPatient } = useSoapStore()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await getPatients(query, 1, 10)
        setResults(data.items)
        setIsOpen(data.items.length > 0)
      } catch {
        setResults([])
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(patient: Patient) {
    setSelectedPatient(patient)
    setQuery("")
    setIsOpen(false)
  }

  function handleClear() {
    setSelectedPatient(null)
    setQuery("")
  }

  if (selectedPatient) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <Search className="h-4 w-4 text-blue-500" />
        <span className="font-medium text-blue-900">
          {selectedPatient.chart_no} - {selectedPatient.name}
        </span>
        <span className="text-sm text-blue-600">
          ({selectedPatient.sex === "M" ? "남" : "여"}, {selectedPatient.birth_date})
        </span>
        <button type="button" onClick={handleClear} className="ml-auto text-blue-400 hover:text-blue-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="환자 검색 (차트번호 또는 이름)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
          {results.map((patient) => (
            <button
              type="button"
              key={patient.id}
              onClick={() => handleSelect(patient)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="font-mono text-sm text-gray-500">{patient.chart_no}</span>
              <span className="font-medium">{patient.name}</span>
              <span className="text-sm text-gray-400">
                {patient.sex === "M" ? "남" : "여"} / {patient.birth_date}
              </span>
              {patient.chronic_diseases.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">
                  {patient.chronic_diseases.join(", ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
