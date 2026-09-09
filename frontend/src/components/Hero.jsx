import {
  FaArrowRight,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pb-24">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="animate-[fadeUp_700ms_ease-out_both]">
          <h1 className="display-font max-w-xl text-5xl font-bold leading-[1.03] tracking-tight text-[#173b3a] sm:text-6xl lg:text-7xl">
            Your Health, <span className="text-[#176b5f]">scheduled</span> with care
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[#607672] sm:text-lg">
            Book appointments, track your queue position in real time and manage your health records, all from your browser or phone. Works on USSD.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/appointments"
              className="flex items-center justify-center gap-3 rounded-full bg-[#176b5f] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(23,107,95,0.18)] transition hover:-translate-y-0.5 hover:bg-[#12584f]"
            >
              Book an appointment <FaArrowRight className="text-xs" />
            </Link>
           
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#55706c]">
            <span className="flex items-center gap-2">
              <FaCheckCircle className="text-[#176b5f]" /> No queues left unseen
            </span>
            <span className="flex items-center gap-2">
              <FaCheckCircle className="text-[#176b5f]" /> Built for Ghana
            </span>
          </div>
        </div>

        <div className="relative animate-[fadeUp_700ms_180ms_ease-out_both]">
          <div className="absolute -right-4 -top-5 h-24 w-24 rounded-full border-[14px] border-[#f4c15b]/35 sm:-right-8 sm:-top-8 sm:h-32 sm:w-32" />
          <div className="relative rounded-[2rem] bg-[#dcebe1] p-3 shadow-[0_24px_60px_rgba(23,59,58,0.12)] sm:p-5">
            <div className="rounded-[1.5rem] bg-white p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8da19a]">
                    Next appointment
                  </p>
                  <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
                    Your care plan
                  </h2>
                </div>
                <span className="rounded-full bg-[#e8f3e8] px-3 py-1.5 text-xs font-bold text-[#176b5f]">
                  Confirmed
                </span>
              </div>
              <div className="mt-7 flex items-center gap-4 rounded-2xl bg-[#f6f8f3] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7d37a] text-lg font-bold text-[#173b3a]">
                  AM
                </div>
                <div>
                  <p className="font-bold text-[#173b3a]">Dr. Ama Mensah</p>
                  <p className="mt-1 text-sm text-[#728681]">
                    General consultation
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#e3ebe4] p-3">
                  <FaClock className="text-[#c37d32]" />
                  <p className="mt-2 text-xs text-[#8da19a]">
                    Thursday, 24 Oct
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#173b3a]">
                    10:30 AM
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e3ebe4] p-3">
                  <FaMapMarkerAlt className="text-[#c37d32]" />
                  <p className="mt-2 text-xs text-[#8da19a]">Location</p>
                  <p className="mt-1 text-sm font-bold text-[#173b3a]">
                    KNUST, Kumasi.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#edf1ed] pt-5 text-sm">
                <span className="text-[#728681]">Queue status</span>
                <span className="font-bold text-[#176b5f]">
                  You're next in 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
