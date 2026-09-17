import { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheck } from "react-icons/fa";
import { mapClinician } from "../../lib/catalogView";
import { listClinicians } from "../../services/catalog";
import { Button, StatusBadge } from "../ui";

const ClinicianSelection = ({ formData, updateFormData, onNext, onBack }) => {
  const [error, setError] = useState("");
  const [clinicians, setClinicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const rows = await listClinicians();
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(mapClinician)
          .filter((doctor) => doctor.available)
          .filter(
            (doctor) =>
              !formData.clinicSite || doctor.clinicSite === formData.clinicSite,
          );
        if (!cancelled) setClinicians(mapped);
      } catch (err) {
        if (!cancelled) {
          setClinicians([]);
          setLoadError(
            err.response?.data?.error ||
              "Could not load clinicians. Check that the API is running and the catalog is seeded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [formData.clinicSite, reloadToken]);

  const handleSelect = (doctor) => {
    updateFormData({
      clinicianId: doctor.id,
      clinician: doctor.name,
      clinicianRoom: doctor.roomLabel,
      roomId: doctor.roomId,
      appointmentDate: "",
      appointmentTime: "",
      timeSlotId: "",
    });
    setError("");
  };

  const handleContinue = () => {
    if (!formData.clinicianId) {
      setError("Please select a doctor");
      return;
    }
    if (!formData.roomId) {
      setError("That clinician has no room assigned. Ask reception or re-seed the catalog.");
      return;
    }
    onNext();
  };

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-7 flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition duration-200 hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          KNUST University Health Services
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight text-[#173b3a] sm:text-3xl">
          Choose Clinician
        </h2>
        <span className="mt-2 inline-block rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold text-[#173b3a]">
          Step 4 of 6
        </span>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-[15px]">
          Select the attending clinician for your consultation.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-[#607672]">Loading clinicians…</p>
        ) : loadError ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-error" role="alert">{loadError}</p>
            <Button variant="secondary" onClick={() => setReloadToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        ) : clinicians.length === 0 ? (
          <p className="text-center text-sm text-[#607672]">
            No clinicians are available at this clinic site right now.
          </p>
        ) : (
          clinicians.map((doctor) => {
            const isSelected = formData.clinicianId === doctor.id;
            return (
              <button
                key={doctor.id}
                type="button"
                onClick={() => handleSelect(doctor)}
                className={`group flex min-h-[100px] w-full cursor-pointer items-center justify-between rounded-2xl border px-5 py-5 text-left transition-all duration-200 sm:px-6 ${
                  isSelected
                    ? "border-[#176b5f] bg-[#f5faf7] shadow-[0_8px_24px_rgba(23,107,95,0.08)]"
                    : "border-gray-200 bg-white hover:border-[#9fc8bb] hover:bg-[#fbfdfc]"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-base font-bold sm:text-lg ${
                      isSelected ? "text-[#176b5f]" : "text-[#173b3a]"
                    }`}
                  >
                    {doctor.name}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-gray-500 sm:text-sm">
                    {doctor.roomLabel}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-[#176b5f] sm:text-sm">
                    {doctor.position}
                  </p>
                  <p className="mt-2">
                    <StatusBadge status="AVAILABLE" size="sm" />
                  </p>
                </div>
                <div
                  className={`ml-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-[#176b5f] bg-[#176b5f] text-white"
                      : "border-gray-300 bg-white text-transparent group-hover:border-[#176b5f]"
                  }`}
                >
                  <FaCheck size={11} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

      <div className="mt-7">
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || clinicians.length === 0}
          className="relative flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition duration-200 hover:bg-[#14594f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Continue</span>
          <FaArrowRight size={12} className="absolute right-6" />
        </button>
      </div>
    </section>
  );
};

export default ClinicianSelection;
