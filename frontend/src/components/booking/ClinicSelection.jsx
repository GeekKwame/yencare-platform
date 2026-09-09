import { useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaClock,
} from "react-icons/fa";

const ClinicSelection = ({
  formData,
  updateFormData,
  onNext,
  onBack,
}) => {
  const [error, setError] = useState("");

  const clinics = [
    {
      id: 1,
      name: "Students' Clinic",
      location: "KNUST University Health Services",
      openTime: "8:00 AM",
      closeTime: "4:00 PM",
    },
    {
      id: 2,
      name: "Social Science Block GF7",
      location: "KNUST University Health Services",
      openTime: "8:00 AM",
      closeTime: "4:00 PM",
    },
  ];

  const handleSelect = (clinic) => {
    updateFormData({
      clinic: clinic.name,
    });

    setError("");
  };

  const handleContinue = () => {
    if (!formData.clinic) {
      setError("Please select a clinic");
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
        className="mb-6 flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-4 py-2.5 text-sm font-semibold text-[#173b3a] transition duration-200 hover:bg-[#f5faf7]"
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
          Choose Your Clinic
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Select the clinic site where you would like to be seen.
        </p>
      </div>

      {/* Clinic Options */}
      <div className="mt-7 space-y-4">
        {clinics.map((clinic) => {
          const isSelected = formData.clinic === clinic.name;

          return (
            <button
              key={clinic.id}
              type="button"
              onClick={() => handleSelect(clinic)}
              className={`group relative w-full rounded-2xl border p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[#176b5f] bg-[#f5faf7] shadow-[0_8px_24px_rgba(23,107,95,0.08)]"
                  : "border-gray-200 bg-white hover:border-[#9fc8bb] hover:bg-[#fbfdfc]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">

                {/* Clinic Information */}
                <div className="min-w-0">
                  <h3
                    className={`text-base font-bold sm:text-lg ${
                      isSelected
                        ? "text-[#176b5f]"
                        : "text-[#173b3a]"
                    }`}
                  >
                    {clinic.name}
                  </h3>

                  <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                    {clinic.location}
                  </p>

                  {/* Opening Hours */}
                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-[#dceee8] text-[#176b5f]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <FaClock size={12} />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Opening Hours
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-gray-600 sm:text-sm">
                        {clinic.openTime} – {clinic.closeTime}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checkbox */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-[#176b5f] bg-[#176b5f] text-white"
                      : "border-gray-300 bg-white text-transparent group-hover:border-[#176b5f]"
                  }`}
                >
                  <FaCheck size={10} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm font-medium text-red-500">
          {error}
        </p>
      )}

      {/* Continue */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleContinue}
          className="relative flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#14594f]"
        >
          <span>Continue</span>

          <FaArrowRight
            size={12}
            className="absolute right-6"
          />
        </button>
      </div>
    </section>
  );
};

export default ClinicSelection;


