const Benefits = () => {
  const benefits = [
    {
      id: 1,
      title: "Choose a facility",
      description: "Pick the Students' Clinic or KNUST Hospital based on your needs.",
    },
    {
      id: 2,
      title: "Select a clinician",
      description: "Browse available doctors and pick the time that works for you.",
    },
    {
      id: 3,
      title: "Book an appointment",
      description: "Confirm your visit and receive an SMS with your reference code.",
    },
    {
      id: 4,
      title: "Track your queue",
      description: "Monitor your position live. Get notified when you're next.",
    },
  ];

  return (
    <section id="how-it-works" className="border-t border-[#dce8df] bg-white/65 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]"> get started</p>
            <h2 className="display-font max-w-lg text-3xl font-bold leading-tight text-[#173b3a] sm:text-4xl">How it works.</h2>
          </div>
         
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <div
            key={benefit.id}
            className="rounded-2xl border border-[#e0e9e1] bg-[#f8faf6] p-5 transition hover:-translate-y-1 hover:border-[#a8c8b2] hover:bg-white hover:shadow-[0_14px_30px_rgba(23,59,58,0.07)]"
          >
            <span className="display-font text-3xl font-bold text-[#c7d9ca]">0{benefit.id}</span>
            <h3 className="mt-6 text-lg font-bold text-[#173b3a]">{benefit.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#728681]">{benefit.description}</p>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;