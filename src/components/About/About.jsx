import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import './About.css'

const About = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section id="about" ref={sectionRef} className="about" data-particle-shape="1">
      <span className="bg-text about-bg-text">ABOUT</span>
      
      <motion.h2
        className="section-title"
        initial={{ opacity: 0, x: -50 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8 }}
      >
        ABOUT US
      </motion.h2>

      <div className="about-grid">
        <motion.div
          className="about-content"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h3 className="about-subtitle">SUPREME KNOWLEDGE FOUNDATION</h3>
          <h2 className="about-heading">REFRESKO'26</h2>
          <div className="about-line" />
          
          <p className="about-description">
            Refresko is the convergence of the finest technical and artistic minds of the country. 
            As the annual fest of Supreme Knowledge Foundation, it is a platform for your ideas 
            to speak out loud and to promote the skills aiming to reach the pinnacle of your mind.
          </p>

          <div className="about-theme">
            <h4 className="theme-title">SKF ANNUAL FEST</h4>
            <div className="theme-line" />
            <p className="theme-description">
              SKF Annual Fest represents the rise of technology to its highest realm—where 
              innovation is born, evolves, and transcends limits. It symbolizes the fusion of 
              human intellect and advanced systems, shaping a future driven by limitless 
              progress and elevated intelligence.
            </p>
          </div>

          <div className="about-stats">
            <motion.div
              className="stat-item"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="stat-number neon-text">15+</span>
              <span className="stat-label">Events</span>
            </motion.div>
            <motion.div
              className="stat-item"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="stat-number neon-text">1K+</span>
              <span className="stat-label">Participants</span>
            </motion.div>
            <motion.div
              className="stat-item"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="stat-number neon-text">₹50k+</span>
              <span className="stat-label">Prize Pool</span>
            </motion.div>
          </div>
        </motion.div>

        <div className="about-visual">
          {/* The 3D particle logo appears here through the background canvas */}
          <div className="visual-placeholder">
            <div className="logo-ring" />
            <div className="logo-ring" />
            <div className="logo-ring" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
