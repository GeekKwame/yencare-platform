import Nav from './components/Nav'
import Home from './pages/Home'
import Appointments from './pages/Appointments'
import Queue from './pages/Queue'
import StaffPortal from './pages/StaffPortal'
import NotFound from './pages/NotFound'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import { Route, Routes } from "react-router-dom"

const App = () => {
  return (
    <section className="min-h-screen overflow-hidden">
      <Nav />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/staff" element={<StaffPortal />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
            <Footer />

    </section>
  )
}

export default App
