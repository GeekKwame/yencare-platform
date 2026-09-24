import { useEffect, useState } from "react";
import { VISIT_TYPES, isValidFullName, isValidGhanaPhone, isValidStudentIndex } from "../../data/bookingOptions";
import { accraNowHm, accraTodayIso } from "../../lib/accraTime";
import { bumpClock, mapClinician } from "../../lib/catalogView";
import { createAppointment, updateAppointmentStatus } from "../../services/appointments";
import { listClinicians } from "../../services/catalog";
import { registerPatient } from "../../services/patients";
import { GhanaPhoneInput, StatusBadge } from "../ui";

const emptyForm = {
  fullName: "",
  studentIndex: "",
  phoneNumber: "",
  visitType: "general-opd",
  clinicianId: "",
};

export default function StaffWalkIn({ clinicSite, onBack, onQueued }) {
  const [form, setForm] = useState(emptyForm);
  const [clinicians, setClinicians] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rows = await listClinicians();
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(mapClinician)
          .filter((doctor) => doctor.clinicSite === clinicSite && doctor.available);
        if (cancelled) return;
        setClinicians(mapped);
        setForm((prev) => ({
          ...prev,
          clinicianId: prev.clinicianId || mapped[0]?.id || "",
        }));
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              "Could not load clinicians for walk-in registration.",
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clinicSite]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!isValidFullName(form.fullName)) {
      setError("Enter the student's full name.");
      return;
    }
    if (form.studentIndex && !isValidStudentIndex(form.studentIndex)) {
      setError("Student index must be 8 digits, or leave it blank.");
      return;
    }
    if (!isValidGhanaPhone(form.phoneNumber)) {
      setError("Enter a valid Ghana phone number.");
      return;
    }

    const clinician = clinicians.find((doctor) => doctor.id === form.clinicianId) || clinicians[0];
    if (!clinician?.id || !clinician.roomId) {
      setError("No clinician/room is available at this clinic site.");
      return;
    }

    setSubmitting(true);
    try {
      const patient = await registerPatient({
        fullName: form.fullName.trim(),
        studentIndex: form.studentIndex.trim() || undefined,
        phoneNumber: form.phoneNumber.trim(),
      });

      let appointmentTime = accraNowHm();
      let appointment = null;
      let lastError = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          appointment = await createAppointment({
            patientId: patient.id || patient._id,
            phoneNumber: form.phoneNumber.trim(),
            clinicianId: clinician.id,
            roomId: clinician.roomId,
            clinicSite,
            visitType: form.visitType,
            bookingType: "WALK_IN",
            appointmentDate: accraTodayIso(),
            appointmentTime,
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (
            err.response?.status !== 409 ||
            err.response?.data?.error?.includes("maximum of 2 active appointments")
          ) {
            throw err;
          }
          appointmentTime = bumpClock(appointmentTime, 1);
        }
      }

      if (!appointment) {
        throw lastError || new Error("Could not create the walk-in appointment.");
      }

      const arrived = await updateAppointmentStatus(appointment.id || appointment._id, "CHECKED_IN");
      const queued = await updateAppointmentStatus(arrived.id || appointment.id, "WAITING");
      setCreated({
        patientName: patient.fullName,
        phone: form.phoneNumber.trim(),
        token: queued.queueToken || arrived.queueToken,
        reference: queued.referenceCode || appointment.referenceCode,
      });
      onQueued?.(queued);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Could not register this walk-in. Check the details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-[#176b5f] bg-white p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#176b5f]">
          Walk-in successfully queued
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#173b3a]">
          {created.patientName} added to the live queue
        </h2>
        <div className="mx-auto mt-5 inline-block min-w-[200px] border border-[#dce8df] bg-[#f7f8f7] p-4">
          <p className="text-[10px] font-semibold uppercase text-[#66706B]">Assigned token</p>
          <p className="mt-1 font-mono text-4xl font-bold text-[#176b5f]">
            {created.token || created.reference}
          </p>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-sm text-[#607672]">
          Reference {created.reference}. A confirmation SMS was sent to {created.phone}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setForm({ ...emptyForm, clinicianId: clinicians[0]?.id || "" });
            }}
            className="rounded-xl border border-[#dce8df] px-4 py-2.5 text-sm font-semibold text-[#173b3a]"
          >
            Add another walk-in
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to Live Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#dce8df] bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
        >
          ← Back to Live Queue
        </button>
        <StatusBadge status="WALK_IN" size="sm" />
      </div>
      <h1 className="text-2xl font-bold text-[#173b3a]">Register Walk-In Student</h1>
      <p className="mt-1 text-sm text-[#607672]">
        For unscheduled students presenting at reception. They are added straight to the live queue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-[#173b3a]">
          Student full name
          <input
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm outline-none focus:border-[#176b5f]"
            placeholder="e.g. Kwame Ofori Atta"
            required
          />
        </label>
        <label className="block text-sm font-semibold text-[#173b3a]">
          Student index (optional)
          <input
            value={form.studentIndex}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                studentIndex: event.target.value.replace(/\D/g, "").slice(0, 8),
              }))
            }
            className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#176b5f]"
            placeholder="e.g. 20689412"
          />
        </label>
        <GhanaPhoneInput
          value={form.phoneNumber}
          helpText={null}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, phoneNumber: nextValue }))}
        />
        <label className="block text-sm font-semibold text-[#173b3a]">
          Visit type
          <select
            value={form.visitType}
            onChange={(event) => setForm((prev) => ({ ...prev, visitType: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm outline-none focus:border-[#176b5f]"
          >
            {VISIT_TYPES.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-[#173b3a]">
          Assign clinician
          <select
            value={form.clinicianId}
            onChange={(event) => setForm((prev) => ({ ...prev, clinicianId: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm outline-none focus:border-[#176b5f]"
          >
            {clinicians.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} · {doctor.roomName}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
        >
          {submitting ? "Adding to queue…" : "Add to live queue"}
        </button>
      </form>
    </div>
  );
}
