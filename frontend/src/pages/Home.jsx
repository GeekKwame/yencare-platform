import Hero from '../components/Hero'
import CareFeature from '../components/CareFeature'
import GetStarted from '../components/GetStarted'
import CareTools from '../components/CareTools'


const Home = () => {
  return (
    <main className='pt-22'>
      <Hero />
      <CareFeature />
      <CareTools />
      <GetStarted />
    </main>
  )
}

export default Home
