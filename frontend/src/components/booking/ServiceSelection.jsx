import { useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaStethoscope,
  FaExclamationTriangle,
} from "react-icons/fa";
import { VISIT_TYPES } from "../../data/bookingOptions";

const ServiceSelection = ({ formData, updateFormData, onNext, onBack }) => {
  const [error, setError] = useState("");

  const handleSelect = (service) => {
    updateFormData({
      visitType: service.id,
    });

    setError("");
  };

  const handleContinue = () => {
    if (!formData.visitType) {
      setError("Please select a service");
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
        className="flex items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={12} />
        Back
      </button>

      {/* Header */}
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          Service Selection
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
          What do you need?
        </h2>

        <span className="mt-2 inline-block rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold text-[#173b3a]">
          Step 3 of 6
        </span>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Select the service you need for your appointment.
        </p>
      </div>

      {/* Services */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {VISIT_TYPES.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleSelect(service)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
              formData.visitType === service.id
                ? "border-[#176b5f] bg-[#f5faf7] text-[#176b5f]"
                : "border-gray-200 text-[#173b3a] hover:border-[#176b5f]"
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                formData.visitType === service.id
                  ? "bg-[#176b5f] text-white"
                  : "bg-[#dce8df] text-[#176b5f]"
              }`}
            >
              <FaStethoscope size={14} />
            </div>

            <span className="text-sm font-semibold">{service.label}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {/* Emergency Notice */}
      <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-500" />

        <div>
          <h3 className="text-sm font-bold text-red-600">Emergency?</h3>

          <p className="mt-1 text-xs leading-5 text-red-600">
            If you are experiencing a serious or life-threatening emergency,
            please seek immediate medical attention instead of booking an
            appointment here.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          onClick={handleContinue}
          className="relative flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14594f]"
        >
          <span>Continue</span>

          <FaArrowRight size={12} className="absolute right-6" />
        </button>
      </div>
    </section>
  );
};

export default ServiceSelection;
