export type UserRole = "doctor" | "nurse" | "admin"

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
