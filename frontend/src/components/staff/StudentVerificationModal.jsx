import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "../ui";

export default function StudentVerificationModal({
  appointment,
  isOpen,
  onClose,
  onVerify,
}) {
  const [studentIndex, setStudentIndex] = useState("");
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [showFailureForm, setShowFailureForm] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (appointment) {
      setStudentIndex(appointment.studentIndex || "");
      setPhotoConfirmed(false);
      setShowFailureForm(false);
      setFailureReason("");
      setError("");
    }
  }, [appointment]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !appointment) return null;

  const isExempt =
    appointment.clinicSite === "knust-hospital" && !appointment.studentIndex;

  const validateIndex = (index) => {
    const cleaned = String(index || "").trim().replace(/\s+/g, "");
    if (!/^\d{8}$/.test(cleaned)) {
      return "Please enter a valid 8-digit KNUST Student Index Number (e.g. 20612345).";
    }
    return null;
  };

  const handleVerify = async (enqueue = false) => {
    setError("");
    const cleanedIndex = String(studentIndex || "").trim().replace(/\s+/g, "");
    const validationErr = validateIndex(cleanedIndex);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    if (!photoConfirmed) {
      setError("Please confirm visual inspection of the physical card photo.");
      return;
    }

    setSubmitting(true);
    try {
      await onVerify(appointment.id, {
        studentIndex: cleanedIndex,
        method: "STUDENT_ID_CARD",
        action: "VERIFY",
        enqueue,
      });
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Verification failed. Please check the index number.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFailVerification = async () => {
    setError("");
    if (!failureReason.trim()) {
      setError("Please provide a reason why verification could not be completed.");
      return;
    }

    setSubmitting(true);
    try {
      await onVerify(appointment.id, {
        method: "STUDENT_ID_CARD",
        action: "FAIL",
        reason: failureReason.trim(),
      });
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to record verification status.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-verification-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#dce8df] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="bg-gradient-to-r from-[#173b3a] to-[#176b5f] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              Identity Verification Gate
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-white/80 hover:text-white text-lg font-bold leading-none p-1 rounded-md"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <h2 id="student-verification-title" className="text-xl font-bold mt-1">
            Verify KNUST Student Status
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Physical KNUST Student ID Card inspection required before consultation queue admission.
          </p>
        </div>

        {/* Patient Details Snapshot */}
        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-[#dce8df] bg-[#F7F8F7] p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#66706B] font-medium">Student Patient</span>
              <span className="font-bold text-[#173b3a] text-sm">{appointment.patientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#66706B] font-medium">Appointment Reference</span>
              <span className="font-mono font-bold text-[#c37d32]">{appointment.reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#66706B] font-medium">Scheduled Visit</span>
              <span className="text-[#173b3a]">
                {appointment.service} · {appointment.time}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#66706B] font-medium">Current Status</span>
              <StatusBadge status={appointment.status} size="sm" />
            </div>
            {appointment.verificationStatus && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                <span className="text-[#66706B] font-medium">Verification Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    appointment.verificationStatus === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : appointment.verificationStatus === "FAILED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {appointment.verificationStatus === "VERIFIED"
                    ? "✓ VERIFIED"
                    : appointment.verificationStatus === "FAILED"
                      ? "⚠️ FAILED"
                      : "● PENDING"}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 font-medium"
            >
              ⚠️ {error}
            </div>
          )}

          {!showFailureForm ? (
            <div className="space-y-4">
              {/* Inspection prompt */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <span className="text-base">🪪</span> Physical Card Challenge
                </p>
                <p className="text-[11px] leading-relaxed">
                  Ask the student to present their official <strong>KNUST Student ID Card</strong>. Verify their face matches the card photo, then enter the 8-digit student index number shown on the card.
                </p>
              </div>

              {/* Index Number Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="verification-student-index"
                  className="block text-xs font-bold text-[#173b3a]"
                >
                  8-Digit KNUST Student Index Number
                </label>
                <input
                  id="verification-student-index"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="e.g. 20612345"
                  value={studentIndex}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setStudentIndex(val);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-[#dce8df] px-3.5 py-2.5 font-mono text-base tracking-wider font-semibold text-[#173b3a] outline-none focus:border-[#176b5f] focus:ring-2 focus:ring-[#176b5f]/20"
                />
                <p className="text-[10px] text-gray-500">
                  Must match the 8-digit index on the physical card and student record.
                </p>
              </div>

              {/* Visual Photo Inspection Confirmation */}
              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={photoConfirmed}
                  onChange={(e) => {
                    setPhotoConfirmed(e.target.checked);
                    setError("");
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#176b5f] focus:ring-[#176b5f]"
                />
                <span className="text-[#173b3a] font-medium leading-snug">
                  I visually inspected the student&apos;s physical ID card photo and confirmed identity with the patient at the desk.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#dce8df]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleVerify(true)}
                  className="w-full rounded-xl bg-[#176b5f] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#14594f] disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Verifying…" : "✓ Verify & Admit to Queue"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerify(false)}
                    className="w-full rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-xs font-semibold text-[#173b3a] hover:bg-[#F7F8F7] disabled:opacity-50"
                  >
                    Verify Only
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowFailureForm(true)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Cannot Verify / Issue
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Failure Recording Form */
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <p className="font-bold">Record Verification Failure</p>
                <p className="mt-0.5 text-[11px]">
                  Document why the student status could not be verified. This will flag the appointment and prevent unverified admission to the queue.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="failure-reason-input"
                  className="block text-xs font-bold text-[#173b3a]"
                >
                  Reason for Failure
                </label>
                <textarea
                  id="failure-reason-input"
                  rows={3}
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  placeholder="e.g. Photo on ID card does not match patient; Card expired; Student refused to present valid card; Index number mismatch."
                  className="w-full rounded-xl border border-rose-300 p-2.5 text-xs text-[#173b3a] outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#dce8df]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowFailureForm(false)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Back to Verify
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFailVerification}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? "Recording…" : "Flag & Fail Verification"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
