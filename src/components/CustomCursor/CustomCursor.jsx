import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import './CustomCursor.css'

const CustomCursor = () => {
  const cursorRef = useRef(null)
  const cursorOuterRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const cursorOuter = cursorOuterRef.current

    const moveCursor = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      })
      gsap.to(cursorOuter, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    const handleMouseEnter = () => {
      gsap.to(cursorOuter, {
        scale: 1.5,
        opacity: 1,
        duration: 0.3
      })
    }

    const handleMouseLeave = () => {
      gsap.to(cursorOuter, {
        scale: 1,
        opacity: 0.5,
        duration: 0.3
      })
    }

    const handleClick = () => {
      gsap.to(cursor, {
        scale: 0.5,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      })
      gsap.to(cursorOuter, {
        scale: 0.8,
        borderColor: 'var(--color-primary)',
        duration: 0.1,
        yoyo: true,
        repeat: 1
      })
    }

    window.addEventListener('mousemove', moveCursor)
    window.addEventListener('click', handleClick)

    // Add hover effect to interactive elements including inputs
    const interactiveElements = document.querySelectorAll('a, button, .interactive, input, textarea, select')
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mouseleave', handleMouseLeave)
    })

    return () => {
      window.removeEventListener('mousemove', moveCursor)
      window.removeEventListener('click', handleClick)
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
      })
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="cursor-dot" />
      <div ref={cursorOuterRef} className="cursor-outer" />
    </>
  )
}

export default CustomCursor
