import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import './FAQ.css'

const faqs = [
  {
    id: 1,
    question: 'What is Refresko?',
    answer: 'Refresko is the annual technical and cultural fest of Supreme Knowledge Foundation. It brings together students from across the country to participate in various technical events, workshops, and cultural performances.'
  },
  {
    id: 2,
    question: 'What is a Pronite?',
    answer: 'Pronite (Pro Night) is the evening entertainment segment featuring live performances by renowned artists, DJs, and bands. It\'s the highlight of our fest where everyone comes together to celebrate and enjoy.'
  },
  {
    id: 3,
    question: 'How to register for Refresko 2026?',
    answer: 'You can register for Refresko 2026 by clicking the "Register" button on our website. Create an account, select the events you want to participate in, and complete the payment process. Early bird discounts are available!'
  },
  {
    id: 4,
    question: 'What is included in the CLASSIC Pass?',
    answer: 'The CLASSIC Pass includes access to all technical events, workshops, exhibitions, and one Pronite. It also includes meals during the fest days and access to the gaming zone.'
  },
  {
    id: 5,
    question: 'Can I participate in multiple events?',
    answer: 'Yes! You can participate in multiple events as long as they don\'t have overlapping schedules. We encourage participants to explore and engage with various activities throughout the fest.'
  }
  
]

const FAQ = () => {
  const [activeId, setActiveId] = useState(null)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const toggleFAQ = (id) => {
    setActiveId(activeId === id ? null : id)
  }

  return (
    <section id="faq" ref={sectionRef} className="faq" data-particle-shape="5">
      <div className="faq-visual">
        {/* Globe visualization through particle canvas */}
        <div className="globe-placeholder">
          <div className="globe-ring" />
          <div className="globe-ring" />
          <div className="globe-ring" />
          <div className="globe-meridian" />
          <div className="globe-meridian rotated" />
        </div>
      </div>

      <motion.h2
        className="section-title faq-title"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
      >
        FAQS
      </motion.h2>

      <div className="faq-container">
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              className={`faq-item ${activeId === faq.id ? 'active' : ''}`}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <button
                className="faq-question interactive"
                onClick={() => toggleFAQ(faq.id)}
              >
                <span className="faq-number">{faq.id}.</span>
                <span className="faq-text">{faq.question}</span>
                <span className="faq-icon">
                  <motion.span
                    animate={{ rotate: activeId === faq.id ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    +
                  </motion.span>
                </span>
              </button>
              
              <AnimatePresence>
                {activeId === faq.id && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <p>{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
