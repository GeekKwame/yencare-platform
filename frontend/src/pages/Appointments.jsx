import BookingForm from "../components/booking/BookingForm";

const Appointments = () => {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center px-5 pb-16 pt-28 sm:px-8 lg:px-10">
      <div className="w-full max-w-3xl">
        <BookingForm />
      </div>
    </main>
  );
};

export default Appointments;
