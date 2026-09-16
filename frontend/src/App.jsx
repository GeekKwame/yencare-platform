import Nav from './components/Nav'
import Home from './pages/Home'
import Appointments from './pages/Appointments'
import Queue from './pages/Queue'
import ClinicActivity from './pages/ClinicActivity'
import StaffPortal from './pages/StaffPortal'
import StaffLogin from './pages/StaffLogin'
import CorridorDisplay from './pages/CorridorDisplay'
import RequireStaffAuth from './components/RequireStaffAuth'
import ConnectivityBanner from './components/ConnectivityBanner'
import NotFound from './pages/NotFound'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import { Route, Routes, useLocation } from 'react-router-dom'

const App = () => {
  const location = useLocation()
  const isStaffShell = location.pathname.startsWith('/staff')

  return (
    <section className="min-h-screen overflow-hidden">
      <ConnectivityBanner />
      {!isStaffShell && <Nav />}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/clinic-activity" element={<ClinicActivity />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route
          path="/staff/display"
          element={
            <RequireStaffAuth roles={['ADMIN']}>
              <CorridorDisplay />
            </RequireStaffAuth>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireStaffAuth>
              <StaffPortal />
            </RequireStaffAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isStaffShell && <Footer />}
    </section>
  )
}

export default App
