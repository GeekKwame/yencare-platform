import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import WelcomeForm from "./WelcomeForm";
import PersonalDetails from "./PersonalDetails";
import ClinicSelection from "./ClinicSelection";
import ClinicianSelection from "./ClinicianSelection";
import ServiceSelection from "./ServiceSelection";
import TimeSlots from "./TimeSlots";
import ReviewBooking from "./ReviewBooking";
import SlotTaken from "./SlotTaken";
import { normalizeReference, rememberBookingReference } from "../../lib/appointmentView";
import { isStudentsClinicOpen } from "../../lib/accraTime";

const DRAFT_KEY = "yencare.booking.draft";

const initialFormData = {
  fullName: "",
  studentIndex: "",
  phoneNumber: "",
  nhisNumber: "",
  patientId: "",
  clinicSite: "",
  visitType: "",
  clinicianId: "",
  clinician: "",
  clinicianRoom: "",
  roomId: "",
  timeSlotId: "",
  appointmentDate: "",
  appointmentTime: "",
};

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistDraft(step, formData) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, formData }));
  } catch {
    /* private mode / quota — wizard still works in memory */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const BookingForm = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(() => {
    const draft = readDraft();
    const saved = Number(draft?.step);
    if (saved >= 2 && saved <= 7) return saved;
    if (searchParams.get("book") === "1" && isStudentsClinicOpen()) return 2;
    return 1;
  });
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    ...(readDraft()?.formData || {}),
  }));
  const [slotTaken, setSlotTaken] = useState(false);
  const [findReference, setFindReference] = useState(
    () => normalizeReference(searchParams.get("ref") || ""),
  );
  const startInFind = searchParams.get("find") === "1" || Boolean(findReference);

  useEffect(() => {
    if (step === 1) {
      clearDraft();
      return;
    }
    persistDraft(step, formData);
  }, [step, formData]);

  useEffect(() => {
    if (searchParams.get("book") === "1") {
      setStep(2);
    } else if (searchParams.get("find") === "1" || searchParams.get("ref")) {
      setStep(1);
      setFindReference(normalizeReference(searchParams.get("ref") || ""));
    }
  }, [searchParams]);

  const updateFormData = (changes) => {
    setFormData((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  const goToNextStep = () => {
    setSlotTaken(false);
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const goToPreviousStep = () => {
    setSlotTaken(false);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStartBooking = (preset = {}) => {
    setSlotTaken(false);
    if (preset.clinicSite) {
      setFormData((prev) => ({ ...prev, clinicSite: preset.clinicSite }));
    }
    setStep(2);
  };

  const handleReset = () => {
    clearDraft();
    setFormData(initialFormData);
    setSlotTaken(false);
    setFindReference("");
    setSearchParams({});
    setStep(1);
  };

  const handleViewAppointment = (reference) => {
    const ref = normalizeReference(reference);
    rememberBookingReference(ref);
    clearDraft();
    setFormData(initialFormData);
    setSlotTaken(false);
    setFindReference(ref);
    setSearchParams(ref ? { ref } : {});
    setStep(1);
  };

  if (slotTaken) {
    return (
      <SlotTaken
        formData={formData}
        onChooseAnother={() => {
          setSlotTaken(false);
          updateFormData({
            appointmentDate: "",
            appointmentTime: "",
            timeSlotId: "",
          });
          setStep(6);
        }}
        onHome={handleReset}
      />
    );
  }

  const renderStep = () => {
    if (step === 1) {
      return <WelcomeForm onStartBooking={handleStartBooking} initialReference={findReference} initialFind={startInFind} />;
    }

    if (step === 2) {
      return (
        <PersonalDetails
          formData={formData}
          updateFormData={updateFormData}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
        />
      );
    }

    if (step === 3) {
      return (
        <ClinicSelection
          formData={formData}
          updateFormData={updateFormData}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
        />
      );
    }

    if (step === 4) {
      return (
        <ServiceSelection
          formData={formData}
          updateFormData={updateFormData}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
        />
      );
    }

    if (step === 5) {
      return (
        <ClinicianSelection
          formData={formData}
          updateFormData={updateFormData}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
        />
      );
    }

    if (step === 6) {
      return (
        <TimeSlots
          formData={formData}
          updateFormData={updateFormData}
          onNext={goToNextStep}
          onBack={goToPreviousStep}
        />
      );
    }

    if (step === 7) {
      return (
        <ReviewBooking
          formData={formData}
          onBack={goToPreviousStep}
          onReset={handleReset}
          onViewAppointment={handleViewAppointment}
          onSlotTaken={() => setSlotTaken(true)}
        />
      );
    }

    return null;
  };

  return <>{renderStep()}</>;
};

export default BookingForm;
