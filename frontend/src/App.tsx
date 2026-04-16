import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout } from "@/components/Layout/AppLayout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { SOAPWriter } from "@/pages/SOAPWriter"
import { DocumentWriter } from "@/pages/DocumentWriter"
import { PolypharmacyReview } from "@/pages/PolypharmacyReview"
import ScreeningPage from "@/pages/ScreeningPage"
import PatientsPage from "@/pages/PatientsPage"
import SettingsPage from "@/pages/SettingsPage"

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
              <Route path="soap" element={<SOAPWriter />} />
              <Route path="drugs" element={<PolypharmacyReview />} />
              <Route path="screening" element={<ScreeningPage />} />
              <Route
                path="documents"
                element={<DocumentWriter />}
              />
              <Route
                path="patients"
                element={<PatientsPage />}
              />
              <Route
                path="settings"
                element={<SettingsPage />}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
