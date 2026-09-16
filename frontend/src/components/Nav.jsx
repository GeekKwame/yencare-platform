import { FaHome, FaCalendarAlt, FaUsers, FaBars, FaMapMarkerAlt } from "react-icons/fa";
import { FiX  } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import Logo from "../assets/Yencare Logo.png";

const Nav = () => {
  const navLinks = [
    {
      id: 1,
      name: "Home",
      to: "/",
      end: true,
      icon: <FaHome />,
    },
    {
      id: 2,
      name: "Facilities",
      to: { pathname: "/", hash: "campus-facilities" },
      icon: <FaMapMarkerAlt />,
    },
    {
      id: 3,
      name: "Appointments",
      to: "/appointments",
      icon: <FaCalendarAlt />,
    },
    {
      id: 4,
      name: "Queue",
      to: "/queue",
      icon: <FaUsers />,
    },
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 mx-auto px-5 py-5  sm:px-8 lg:px-10 bg-[#f6f8f3]">
      <div className="flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2"
          aria-label="Yencare home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-[#f7d37a]">
            <img src={Logo} alt="" />
          </span>
          <span className="display-font text-xl font-bold tracking-tight text-[#173b3a]">
            Yencare
          </span>
        </NavLink>

        <ul className="hidden items-center gap-8 text-sm font-semibold text-[#55706c] md:flex">
          {navLinks.map((li) => (
            <li key={li.id}>
              <NavLink
                to={li.to}
                end={li.end}
                className="group flex items-center gap-2 transition-colors hover:text-[#176b5f]"
              >
                <span className="text-[#176b5f] opacity-70 transition-opacity group-hover:opacity-100">
                  {li.icon}
                </span>
                {li.name}
              </NavLink>
            </li>
          ))}
        </ul>

        <NavLink
          to="/staff"
          className="hidden items-center gap-2 rounded-full bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12584f] sm:px-5 md:flex"
        >
          Staff portal
        </NavLink>
{/* Hamburger button */}
        <button onClick={()=> setIsMenuOpen(!isMenuOpen)}
          type="button"
          className="cursor-pointer rounded-xl border border-[#dce8df] p-3 text-[#176b5f] md:hidden"
        >
          {isMenuOpen? <FiX size={20}/> : <FaBars size={20}/>}
        </button>
      </div>


{/* Mobile menu for navigation */}
{isMenuOpen && 
 <div onClick={()=> setIsMenuOpen(false)}  className=" w-[90%] mt-5 rounded-2xl border border-[#dce8df] bg-[#173b3a] p-3 md:hidden z-50 absolute  left-1/2 -translate-x-1/2 transition-all duration-300">
        <ul className="space-y-1">
          {navLinks.map((li) => (
            <li key={li.id}>
              <NavLink
                to={li.to}
                end={li.end}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition hover:bg-[#24514d]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2b6359] text-[#f7d37a]">
                  {li.icon}
                </span>
                {li.name}
              </NavLink>
            </li>
          ))}
          <li className="border-t border-[#37615b] pt-1">
            <NavLink
              to="/staff"
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-[#f7d37a] transition hover:bg-[#24514d]"
            >
              Staff portal <span aria-hidden="true">&rarr;</span>
            </NavLink>
          </li>
        </ul>
      </div>
}
     

    </nav>
  );
};

export default Nav;
