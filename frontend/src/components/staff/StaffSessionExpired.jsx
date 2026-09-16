import { Link } from "react-router-dom";
import Logo from "../../assets/Yencare Logo.png";

export default function StaffSessionExpired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] p-4">
      <div className="w-full max-w-[460px] border border-[#D8DCD9] bg-white p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <img src={Logo} alt="YɛnCare" className="mx-auto mb-6 h-10 w-auto" />
        <span className="inline-block border border-[#D8DCD9] bg-[#F0F2F1] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#66706B]">
          Security timeout
        </span>
        <h1 className="mt-3 text-2xl font-bold text-[#111111]">Session expired</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#66706B]">
          For clinical confidentiality at KNUST Students&apos; Clinic, your YɛnCare workstation
          session has timed out. Sign in again to continue.
        </p>
        <Link
          to="/staff/login"
          className="mt-8 inline-flex w-full items-center justify-center bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#14594f]"
        >
          Sign in again
        </Link>
      </div>
    </main>
  );
}
