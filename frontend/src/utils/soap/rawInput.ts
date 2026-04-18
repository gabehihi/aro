export const SOAP_TEMPLATE_VERSION = "TEMPLATE_V2"

export function buildSoapRawInput(snapshot: unknown): string {
  return `${SOAP_TEMPLATE_VERSION}|${JSON.stringify(snapshot)}`
}

export interface ParsedSoapRawInput<T = unknown> {
  version: string
  snapshot: T
}

export function parseSoapRawInput<T = unknown>(
  rawInput: string,
): ParsedSoapRawInput<T> | null {
  const delimiterIndex = rawInput.indexOf("|")
  if (delimiterIndex < 0) return null

  const version = rawInput.slice(0, delimiterIndex).trim()
  const payload = rawInput.slice(delimiterIndex + 1)
  if (!version || !payload) return null

  try {
    return {
      version,
      snapshot: JSON.parse(payload) as T,
    }
  } catch {
    return null
  }
}
