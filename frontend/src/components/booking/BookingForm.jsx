import { useState } from "react";
import WelcomeForm from "./WelcomeForm";
import PersonalDetails from "./PersonalDetails";
import ClinicSelection from "./ClinicSelection";
import ClinicianSelection from "./ClinicianSelection";
import ServiceSelection from "./ServiceSelection";
import TimeSlots from "./TimeSlots";

const initialFormData = {
  fullName: "",
  studentIndex: "",
  phoneNumber: "",
  nhisNumber: "",
  clinic: "",
  service: "",
  clinician: "",
  clinicianRoom: "",
  appointmentDate: "",
  appointmentTime: "",
};

const BookingForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);

  const updateFormData = (changes) => {
    setFormData((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  const goToNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const goToPreviousStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStartBooking = () => {
    setStep(2);
  };

  const renderStep = () => {
    // Step 1: Welcome
    if (step === 1) {
      return (
        <WelcomeForm
          onStartBooking={handleStartBooking}
        />
      );
    }

    // Step 2: Personal Details
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

    // Step 3: Clinic Selection
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

    // Step 4: Service Selection
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

    // Step 5: Clinician Selection
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

    // Step 6: Appointment Time
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

    return null;
  };

  return <>{renderStep()}</>;
};

export default BookingForm;