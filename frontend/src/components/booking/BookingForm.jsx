import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import WelcomeForm from "./WelcomeForm";
import PersonalDetails from "./PersonalDetails";
import ClinicSelection from "./ClinicSelection";
import ClinicianSelection from "./ClinicianSelection";
import ServiceSelection from "./ServiceSelection";
import TimeSlots from "./TimeSlots";
import ReviewBooking from "./ReviewBooking";
import SlotTaken from "./SlotTaken";
import { normalizeReference } from "../../lib/appointmentView";

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

const BookingForm = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [slotTaken, setSlotTaken] = useState(false);
  const [findReference, setFindReference] = useState(
    () => normalizeReference(searchParams.get("ref") || ""),
  );

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
    setFormData(initialFormData);
    setSlotTaken(false);
    setFindReference("");
    setSearchParams({});
    setStep(1);
  };

  const handleViewAppointment = (reference) => {
    const ref = normalizeReference(reference);
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
      return <WelcomeForm onStartBooking={handleStartBooking} initialReference={findReference} />;
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
