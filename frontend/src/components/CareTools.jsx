import {
  FaArrowRight,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
} from "react-icons/fa";

const CareTools = () => {
  const steps = [
    {
      number: "01",
      title: "Choose your care",
      description:
        "Start with the service you need and find trusted care.",
      icon: <FaSearch />,
    },
    {
      number: "02",
      title: "Find a time that fits",
      description:
        "See available providers and select an appointment that works for your day.",
      icon: <FaCalendarAlt />,
    },
    {
      number: "03",
      title: "Stay ready for your visit",
      description:
        "Get directions, follow your queue, and arrive with everything in place.",
      icon: <FaMapMarkerAlt />,
    },
  ];

  return (
    <section className="border-t border-[#dce8df] bg-[#edf5ed] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
              Your visit, made simple
            </p>
            <h2 className="display-font max-w-md text-3xl font-bold leading-tight text-[#173b3a] sm:text-4xl">
              Plan your next visit with confidence.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#607672]">
              From the first search to the moment you are seen, Yencare keeps
              the important details together.
            </p>
            
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-[#d7e6d8] bg-white p-5"
              >
                <div className="flex items-center justify-between text-[#176b5f]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f1e6]">
                    {step.icon}
                  </span>
                  <span className="display-font text-xl font-bold text-[#c7d9ca]">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-7 text-base font-bold leading-snug text-[#173b3a]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#728681]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        {/* statistics */}
        <div className="mt-14 grid gap-4 rounded-3xl bg-[#173b3a] p-6 text-white sm:grid-cols-3 sm:p-8">
          <div>
            <p className="display-font text-3xl font-bold text-[#f7d37a]">
              24/7
            </p>
            <p className="mt-1 text-sm text-[#b8cfbf]">
              Access to your care details
            </p>
          </div>
          <div>
            <p className="display-font text-3xl font-bold text-[#f7d37a]">
              1 place
            </p>
            <p className="mt-1 text-sm text-[#b8cfbf]">
              For appointments and queues
            </p>
          </div>
          <div>
            <p className="display-font text-3xl font-bold text-[#f7d37a]">
              SMS
            </p>
            <p className="mt-1 text-sm text-[#b8cfbf]">
              With an SMS integration for non-smart phone users
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareTools;
