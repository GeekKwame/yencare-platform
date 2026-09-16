import { useState } from "react";
import WelcomeForm from "./WelcomeForm";
import PersonalDetails from "./PersonalDetails";
import ClinicSelection from "./ClinicSelection";
import ClinicianSelection from "./ClinicianSelection";
import ServiceSelection from "./ServiceSelection";
import TimeSlots from "./TimeSlots";
import ReviewBooking from "./ReviewBooking";
import { initialFormData } from "./initialFormData";

const BookingForm = ({ formData, setFormData }) => {
  const [step, setStep] = useState(1);

  const updateFormData = (changes) => {
    setFormData((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  const goToNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const goToPreviousStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStartBooking = () => {
    setStep(2);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setStep(1);
  };

  const renderStep = () => {
    if (step === 1) {
      return <WelcomeForm onStartBooking={handleStartBooking} />;
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
        />
      );
    }

    return null;
  };

  return <>{renderStep()}</>;
};

export default BookingForm;
