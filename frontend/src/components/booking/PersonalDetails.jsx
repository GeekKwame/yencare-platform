import { useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { registerPatient } from "../../services/patients";
import { useApiRequest } from "../../hooks/useApiRequest";

const PersonalDetails = ({ formData, updateFormData, onNext, onBack }) => {
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const { run, status } = useApiRequest(registerPatient);

  const handleChange = (e) => {
    const { name, value } = e.target;

    updateFormData({
      [name]: value,
    });

    if (apiError) {
      setApiError("");
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Please enter your name";
    }

    if (!formData.studentIndex.trim()) {
      newErrors.studentIndex = "Please enter your student index number";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Please enter your phone number";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validateForm()) return;

    try {
      const patient = await run({
        fullName: formData.fullName,
        studentIndex: formData.studentIndex,
        phoneNumber: formData.phoneNumber,
        nhis: formData.nhisNumber,
      });

      updateFormData({ patientId: patient.id });
      onNext();
    } catch (err) {
      if (!err.response) {
        setApiError(
          "Unable to connect to the server. Please check your network connection and try again."
        );
      } else if (err.response.status === 400) {
        setApiError(
          err.response.data?.error ||
            err.response.data?.message ||
            "Please check your details and try again."
        );
      } else if (err.response.status === 409) {
        setApiError(
          err.response.data?.error ||
            "This student index and phone number belong to different patients. Please double-check your details."
        );
      } else {
        setApiError(
          err.response.data?.error ||
            err.response.data?.message ||
            "Something went wrong. Please try again."
        );
      }
    }
  };

  return (
    <main>
      <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
        <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
          >
            <FaArrowLeft size={12} />
            <span>Back</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
            Personal Details
          </p>

          <h2 className="display-font mt-2 text-center text-2xl font-bold leading-tight text-[#173b3a] sm:text-3xl">
            Your Details
          </h2>

          <span className="mt-2 rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold text-[#173b3a]">
            Step 2 of 3
          </span>

          <p className="mt-3 max-w-xl text-center text-sm leading-6 text-gray-500">
            Please enter your student details. We will send your appointment
            reference by SMS.
          </p>
        </div>

        <form onSubmit={handleContinue} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-semibold text-[#173b3a]"
            >
              Name <span className="text-red-500">*</span>
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Akosua Boateng"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#176b5f]/20 ${
                errors.fullName
                  ? "border-red-400"
                  : "border-gray-200 focus:border-[#176b5f]"
              }`}
            />

            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="studentIndex"
              className="mb-1.5 block text-sm font-semibold text-[#173b3a]"
            >
              Student Index Number <span className="text-red-500">*</span>
            </label>

            <input
              id="studentIndex"
              name="studentIndex"
              type="text"
              value={formData.studentIndex}
              onChange={handleChange}
              placeholder="e.g. 20612345"
              maxLength={8}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#176b5f]/20 ${
                errors.studentIndex
                  ? "border-red-400"
                  : "border-gray-200 focus:border-[#176b5f]"
              }`}
            />

            {errors.studentIndex && (
              <p className="mt-1 text-xs text-red-500">{errors.studentIndex}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="mb-1.5 block text-sm font-semibold text-[#173b3a]"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>

            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="e.g. 0200000000"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#176b5f]/20 ${
                errors.phoneNumber
                  ? "border-red-400"
                  : "border-gray-200 focus:border-[#176b5f]"
              }`}
            />

            {errors.phoneNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="nhisNumber"
              className="mb-1.5 block text-sm font-semibold text-[#173b3a]"
            >
              NHIS Number{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>

            <input
              id="nhisNumber"
              name="nhisNumber"
              type="text"
              value={formData.nhisNumber}
              onChange={handleChange}
              placeholder="e.g. NHIS-000000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#176b5f] focus:ring-2 focus:ring-[#176b5f]/20"
            />
          </div>

          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="relative flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14594f] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{status === "loading" ? "Saving..." : "Continue"}</span>
            <FaArrowRight size={12} className="absolute right-6" />
          </button>
        </form>
      </section>
    </main>
  );
};

export default PersonalDetails;