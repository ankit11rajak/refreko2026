import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import About from './components/About/About'
import Performers from './components/Performers/Performers'
import Events from './components/Events/Events'
import TechTeam from './components/TechTeam/TechTeam'
import FAQ from './components/FAQ/FAQ'
import Footer from './components/Footer/Footer'
import CustomCursor from './components/CustomCursor/CustomCursor'
import ParticleCanvas from './components/ParticleCanvas/ParticleCanvas'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

function App() {
  const mainRef = useRef(null)

  return (
    <div className="app">
      <CustomCursor />
      <ParticleCanvas />
      <div className="hex-grid-overlay" />
      <div ref={mainRef} className="main-content">
        <Navbar />
        <Hero />
        <About />
        <Performers />
        <Events />
        <TechTeam />
        <FAQ />
        <Footer />
      </div>
    </div>
  )
}

export default App
