import { FaUsers } from "react-icons/fa";

const Queue = () => {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-5 pt-22 sm:px-8 lg:px-10">
      <section className="max-w-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dcebe1] text-xl text-[#176b5f]">
          <FaUsers />
        </span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
          Queue tracking
        </p>
        <h1 className="display-font mt-3 text-5xl font-bold leading-tight text-[#173b3a]">
          Know your place in line.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-7 text-[#607672]">
          Enter your booking details to see your live queue position and plan
          your time with less waiting.
        </p>
      </section>
    </main>
  );
};

export default Queue;
