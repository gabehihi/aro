import api from "@/lib/api"
import type { TokenResponse, User, UserUpdatePayload } from "@/types"

export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const formData = new URLSearchParams()
  formData.append("username", username)
  formData.append("password", password)

  const { data } = await api.post<TokenResponse>("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me")
  return data
}

export async function updateMe(body: UserUpdatePayload): Promise<User> {
  const { data } = await api.patch<User>("/auth/me", body)
  return data
}
