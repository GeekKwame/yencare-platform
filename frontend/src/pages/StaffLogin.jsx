import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";
import { DEMO_STAFF_ACCOUNTS, DEMO_STAFF_PASSWORD } from "../services/staffAuth";
import Logo from "../assets/Yencare Logo.png";

export default function StaffLogin() {
  const { staff, login } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const showDemo =
    import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_STAFF === "true";

  const redirectTo = location.state?.from || "/staff";

  if (staff) {
    return <Navigate to="/staff" replace />;
  }

  async function submit(nextIdentifier, nextPassword) {
    setLoading(true);
    setError("");
    try {
      await login({
        identifier: nextIdentifier,
        password: nextPassword,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Could not sign in. Check your staff ID and password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    return submit(identifier, password);
  }

  function handleDemo(account) {
    setIdentifier(account.identifier);
    setPassword(account.password);
    return submit(account.identifier, account.password);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f8f3] px-4 py-10">
      <div className="w-full max-w-[460px] border border-[#dce8df] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] md:p-8">
        <div className="mb-6 flex flex-col items-center border-b border-[#E5E7E6] pb-4 text-center">
          <img src={Logo} alt="YɛnCare" className="h-16 w-auto object-contain" />
          <h1 className="mt-4 text-lg font-bold tracking-tight text-[#173b3a]">Staff portal</h1>
          <p className="mt-1 text-xs font-medium text-[#66706B]">KNUST Students&apos; Clinic</p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="staff-identifier" className="block text-xs font-semibold text-[#173b3a]">
              Staff ID or Email
            </label>
            <input
              id="staff-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full border border-[#C8CDCA] px-3.5 py-2.5 text-sm text-[#173b3a] outline-none transition focus:border-[#176b5f] focus:ring-1 focus:ring-[#176b5f]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-password" className="block text-xs font-semibold text-[#173b3a]">
              Password or PIN
            </label>
            <input
              id="staff-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full border border-[#C8CDCA] px-3.5 py-2.5 text-sm text-[#173b3a] outline-none transition focus:border-[#176b5f] focus:ring-1 focus:ring-[#176b5f]"
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2 text-xs text-[#9B2C2C]">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in to Workstation"}
            </button>
          </div>
        </form>

        {showDemo && (
        <div className="space-y-2 border-t border-[#E5E7E6] pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#66706B]">
            Instant Demo Sign-In (Select Role):
          </div>
          <div className="space-y-1.5">
            {DEMO_STAFF_ACCOUNTS.map((account) => (
              <button
                key={account.staff.staffId}
                type="button"
                disabled={loading}
                onClick={() => handleDemo(account)}
                className="flex w-full items-center justify-between border border-[#D8DCD9] px-3 py-2 text-left text-xs font-medium text-[#173b3a] transition hover:border-[#176b5f] hover:bg-[#E7F5F1]/30 disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#176b5f]" />
                  <span>
                    {account.staff.name} (
                    {account.staff.role === "DOCTOR"
                      ? "Doctor"
                      : account.staff.role === "ADMIN"
                        ? "Admin"
                        : "Receptionist"}
                    )
                  </span>
                </span>
                <span className="font-mono text-[10px] text-[#66706B]">
                  → {account.destination}
                </span>
              </button>
            ))}
          </div>
          <p className="pt-1 text-[11px] text-[#66706B]">
            Demo password for typed sign-in: <span className="font-mono">{DEMO_STAFF_PASSWORD}</span>
          </p>
        </div>
        )}

        <div className="mt-5 border-t border-[#E5E7E6] pt-3.5 text-center">
          <Link to="/" className="text-xs font-semibold text-[#66706B] hover:text-[#173b3a]">
            ← Return to Patient Web
          </Link>
        </div>
      </div>
    </div>
  );
}
