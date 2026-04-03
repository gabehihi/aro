import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout } from "@/components/Layout/AppLayout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Placeholder } from "@/pages/Placeholder"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route
                path="soap"
                element={<Placeholder title="SOAP 작성" />}
              />
              <Route
                path="drugs"
                element={<Placeholder title="약물 검토" />}
              />
              <Route
                path="screening"
                element={<Placeholder title="검진 추적" />}
              />
              <Route
                path="documents"
                element={<Placeholder title="문서 발급" />}
              />
              <Route
                path="patients"
                element={<Placeholder title="환자 관리" />}
              />
              <Route
                path="settings"
                element={<Placeholder title="설정" />}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
