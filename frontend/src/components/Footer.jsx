
import { Link } from "react-router-dom";
import Logo from "../assets/Yencare Logo.png";



const Footer = () => {

const date = new Date().getFullYear()



  return (
    <footer className="bg-[#173b3a] px-5 pb-7 pt-14 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]">
          <div>
            <Link
              to="/"
              className="flex items-center gap-2"
              aria-label="Yencare home"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl  text-lg font-bold text-[#173b3a]">
                <img src={Logo} alt="Yencare Logo" />
              </span>
              <span className="display-font text-xl font-bold tracking-tight">
                Yencare
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#b8cfbf]">
              Making healthcare easier to find, plan, and access for everyone in
              Ghana.
            </p>
            
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f7d37a]">Explore</h2>
            <ul className="mt-5 space-y-3 text-sm text-[#b8cfbf]">
              <li>
                <Link
                  to="/appointments"
                  className="transition hover:text-white"
                >
                  Appointments
                </Link>
              </li>
              <li>
                <Link to="/queue" className="transition hover:text-white">
                  Queue tracking
                </Link>
              </li>
             
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f7d37a]">Support</h2>
            <ul className="mt-5 space-y-3 text-sm text-[#b8cfbf]">
              <li>
                <a
                  href="mailto:hello@yencare.com"
                  className="transition hover:text-white"
                >
                  Contact us
                </a>
              </li>
             
            </ul>
          </div>
          {/* <div>
            <h2 className="text-sm font-bold text-[#f7d37a]">
              Stay in the loop
            </h2>
            <p className="mt-5 text-sm leading-6 text-[#b8cfbf]">
              Useful updates for managing your care, occasionally.
            </p>
            <form
              className="mt-4 flex rounded-xl bg-[#24514d] p-1.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                aria-label="Email address"
                type="email"
                placeholder="Your email address"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#9ab8aa]"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7d37a] text-[#173b3a] transition hover:bg-white"
              >
                <FaArrowRight className="text-xs" />
              </button>
            </form>
          </div> */}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-[#37615b] pt-6 text-sm text-[#91afa1] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {date} Yencare. Built for better access.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
