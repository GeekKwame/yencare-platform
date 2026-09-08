import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";

const CareFeature = () => {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-[#dcebe1] shadow-[0_22px_55px_rgba(23,59,58,0.14)] sm:min-h-[460px]">
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85"
            alt="Doctor speaking with a patient in a bright clinic"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#173b3a]/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/15 p-4 text-white backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f7d37a]">Care feels better</p>
            <p className="mt-2 max-w-sm text-lg font-semibold leading-6">When the right information is close at hand.</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">A better care journey</p>
          <h2 className="display-font mt-4 max-w-xl text-4xl font-bold leading-tight text-[#173b3a] sm:text-5xl">
            More time for what matters.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#607672] sm:text-lg">
            Yencare helps you spend less time figuring out the system and more time focused on your wellbeing.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 shrink-0 text-[#176b5f]" />
              <div><p className="font-bold text-[#173b3a]">Clear choices, from the start</p><p className="mt-1 text-sm leading-6 text-[#728681]">Compare facilities and appointment times in one simple view.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 shrink-0 text-[#176b5f]" />
              <div><p className="font-bold text-[#173b3a]">Updates when you need them</p><p className="mt-1 text-sm leading-6 text-[#728681]">Stay close to your queue without staying stuck in the waiting room.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 shrink-0 text-[#176b5f]" />
              <div><p className="font-bold text-[#173b3a]">Your care, in one place</p><p className="mt-1 text-sm leading-6 text-[#728681]">Keep your upcoming visits and health details easy to find.</p></div>
            </div>
          </div>
         
        </div>
      </div>
    </section>
  );
};

export default CareFeature;
