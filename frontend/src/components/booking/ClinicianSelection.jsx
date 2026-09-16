import { useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheck } from "react-icons/fa";
import { GoDotFill } from "react-icons/go";
import { CLINICIANS } from "../../data/bookingOptions";

const ClinicianSelection = ({ formData, updateFormData, onNext, onBack }) => {
  const [error, setError] = useState("");
  const siteClinicians = CLINICIANS.filter(
    (doctor) => !formData.clinicSite || doctor.clinicSite === formData.clinicSite,
  );

  const handleSelect = (doctor) => {
    updateFormData({
      clinicianId: doctor.id,
      clinician: doctor.name,
      clinicianRoom: doctor.roomLabel,
    });

    setError("");
  };

  const handleContinue = () => {
    if (!formData.clinicianId) {
      setError("Please select a doctor");
      return;
    }

    onNext();
  };

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-7 flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition duration-200 hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

      {/* Header */}
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

      {/* Doctors */}
      <div className="mt-8 space-y-4">
        {siteClinicians.map((doctor) => {
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
              {/* Doctor Information */}
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
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 sm:text-sm">
                  <GoDotFill className="text-green-600" size={10} />
                  Available for booking
                </p>
              </div>

              {/* Checkbox */}
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
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
      )}

      {/* Continue */}
      <div className="mt-7">
        <button
          type="button"
          onClick={handleContinue}
          className="relative flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition duration-200 hover:bg-[#14594f]"
        >
          <span>Continue</span>

          <FaArrowRight size={12} className="absolute right-6" />
        </button>
      </div>
    </section>
  );
};

export default ClinicianSelection;
