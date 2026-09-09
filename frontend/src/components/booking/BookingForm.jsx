import { useState } from "react";
import WelcomeForm from "./WelcomeForm";
import PersonalDetails from "./PersonalDetails";
import ClinicSelection from "./ClinicSelection";
import ServiceSelection from "./ServiceSelection";

const initialFormData = {
  fullName: "",
  studentIndex: "",
  phoneNumber: "",
  nhisNumber: "",
  clinic: "",
  service: "",
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
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const goToPreviousStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStartBooking = () => {
    setStep(2);
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

    return (
      <ServiceSelection
        formData={formData}
        updateFormData={updateFormData}
        onNext={goToNextStep}
        onBack={goToPreviousStep}
      />
    );
  };

  return <>{renderStep()}</>;
};

export default BookingForm;
