import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import { SignInGate } from '@/components/SignInGate'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Goals } from '@/pages/Goals'
import { Portfolio } from '@/pages/Portfolio'
import { Loans } from '@/pages/Loans'
import { Savings } from '@/pages/Savings'
import { Settings } from '@/pages/Settings'
import { GoalDetail } from '@/pages/GoalDetail'
import { NetWorth } from '@/pages/NetWorth'

function App() {
  return (
    <AuthProvider>
      <SignInGate>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="goals" element={<Goals />} />
              <Route path="goals/:goalId" element={<GoalDetail />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="loans" element={<Loans />} />
              <Route path="savings" element={<Savings />} />
              <Route path="settings" element={<Settings />} />
              <Route path="net-worth" element={<NetWorth />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SignInGate>
    </AuthProvider>
  )
}

export default App
