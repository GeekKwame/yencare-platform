import CampusFacilities from "../components/CampusFacilities";
import CareFeature from "../components/CareFeature";
import CareTools from "../components/CareTools";
import GetStarted from "../components/GetStarted";
import Hero from "../components/Hero";

const Home = () => {
  return (
    <main>
      <Hero />
      <CareTools />
      <CareFeature />
      <GetStarted />
      <CampusFacilities />
    </main>
  );
};

export default Home;
