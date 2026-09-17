import { FaHome, FaCalendarAlt, FaUsers, FaBars, FaMapMarkerAlt } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import Logo from "../assets/Yencare Logo.png";
import { Button } from "./ui";

const Nav = () => {
  const navLinks = [
    { id: 1, name: "Home", to: "/", end: true, icon: <FaHome /> },
    { id: 2, name: "Facilities", to: { pathname: "/", hash: "campus-facilities" }, icon: <FaMapMarkerAlt /> },
    { id: 3, name: "Appointments", to: "/appointments", icon: <FaCalendarAlt /> },
    { id: 4, name: "Queue", to: "/queue", icon: <FaUsers /> },
    { id: 5, name: "Clinic activity", to: "/clinic-activity", icon: <FaUsers /> },
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed z-50 w-full border-b border-clinic-border bg-clinic-bg px-5 py-4 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2" aria-label="YɛnCare home">
          <img src={Logo} alt="" className="h-9 w-9 object-contain" />
          <span className="display-font text-xl font-bold tracking-tight text-primary">YɛnCare</span>
        </NavLink>

        <ul className="hidden items-center gap-8 text-sm font-semibold text-text-muted md:flex">
          {navLinks.map((li) => (
            <li key={li.id}>
              <NavLink
                to={li.to}
                end={li.end}
                className="group flex items-center gap-2 transition-colors hover:text-accent"
              >
                <span className="text-accent opacity-70 transition-opacity group-hover:opacity-100">{li.icon}</span>
                {li.name}
              </NavLink>
            </li>
          ))}
        </ul>

        <Button as={NavLink} to="/staff" variant="accent" className="hidden md:inline-flex">
          Staff portal
        </Button>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          type="button"
          className="min-h-11 min-w-11 cursor-pointer border border-clinic-border p-3 text-accent md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
          aria-controls="patient-mobile-nav"
        >
          {isMenuOpen ? <FiX size={20} /> : <FaBars size={20} />}
        </button>
      </div>

      {isMenuOpen && (
        <div
          id="patient-mobile-nav"
          className="absolute left-1/2 z-50 mt-4 w-[90%] -translate-x-1/2 border border-clinic-border bg-primary p-3 md:hidden"
        >
          <ul className="space-y-1">
            {navLinks.map((li) => (
              <li key={li.id}>
                <NavLink
                  to={li.to}
                  end={li.end}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex min-h-11 items-center gap-3 px-3 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  <span className="flex h-8 w-8 items-center justify-center bg-accent text-white">{li.icon}</span>
                  {li.name}
                </NavLink>
              </li>
            ))}
            <li className="border-t border-inverse-border pt-1">
              <NavLink
                to="/staff"
                onClick={() => setIsMenuOpen(false)}
                className="flex min-h-11 items-center justify-between px-3 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Staff portal <span aria-hidden="true">&rarr;</span>
              </NavLink>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Nav;
