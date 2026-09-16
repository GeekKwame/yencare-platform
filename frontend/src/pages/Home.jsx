import Hero from '../components/Hero'
import CareFeature from '../components/CareFeature'
import CampusFacilities from '../components/CampusFacilities'
import GetStarted from '../components/GetStarted'
import CareTools from '../components/CareTools'


const Home = () => {
  return (
    <main className='pt-22'>
      <Hero />
      <CampusFacilities />
      <CareFeature />
      <CareTools />
      <GetStarted />
    </main>
  )
}

export default Home
