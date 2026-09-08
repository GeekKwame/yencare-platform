import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-10">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">404</p>
        <h1 className="display-font mt-3 text-5xl font-bold text-[#173b3a]">This page went missing.</h1>
        <p className="mt-5 text-lg text-[#607672]">Let&apos;s get you back to the care you need.</p>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-[#176b5f] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#12584f]">Back home</Link>
      </section>
    </main>
  );
};

export default NotFound;
