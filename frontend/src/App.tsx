import { Suspense, lazy, useEffect, useRef } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/hooks/useAuth"

const AppLayout = lazy(() =>
  import("@/components/Layout/AppLayout").then((mod) => ({ default: mod.AppLayout })),
)
const Login = lazy(() =>
  import("@/pages/Login").then((mod) => ({ default: mod.Login })),
)
const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((mod) => ({ default: mod.Dashboard })),
)
const ForbiddenPage = lazy(() =>
  import("@/pages/ForbiddenPage").then((mod) => ({ default: mod.ForbiddenPage })),
)
const SOAPWriter = lazy(() =>
  import("@/pages/SOAPWriter").then((mod) => ({ default: mod.SOAPWriter })),
)
const DocumentWriter = lazy(() =>
  import("@/pages/DocumentWriter").then((mod) => ({ default: mod.DocumentWriter })),
)
const PolypharmacyReview = lazy(() =>
  import("@/pages/PolypharmacyReview").then((mod) => ({ default: mod.PolypharmacyReview })),
)
const ScreeningPage = lazy(() => import("@/pages/ScreeningPage"))
const PatientsPage = lazy(() => import("@/pages/PatientsPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))

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
        <AppBootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AppBootstrap() {
  const { checkAuth, isLoading } = useAuth()
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    void checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return <FullscreenLoader />
  }

  return (
    <Suspense fallback={<FullscreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="forbidden" element={<ForbiddenPage />} />
            <Route path="screening" element={<ScreeningPage />} />
            <Route path="patients" element={<PatientsPage />} />

            <Route element={<ProtectedRoute roles={["doctor"]} />}>
              <Route path="soap" element={<SOAPWriter />} />
              <Route path="drugs" element={<PolypharmacyReview />} />
            </Route>

            <Route element={<ProtectedRoute roles={["doctor", "nurse"]} />}>
              <Route path="documents" element={<DocumentWriter />} />
            </Route>

            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

function FullscreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">로딩 중...</div>
    </div>
  )
}
