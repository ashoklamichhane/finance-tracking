import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Overview } from '@/pages/Overview'
import { Goals } from '@/pages/Goals'
import { Portfolio } from '@/pages/Portfolio'
import { Loans } from '@/pages/Loans'
import { Savings } from '@/pages/Savings'
import { Settings } from '@/pages/Settings'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="goals" element={<Goals />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="loans" element={<Loans />} />
          <Route path="savings" element={<Savings />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
