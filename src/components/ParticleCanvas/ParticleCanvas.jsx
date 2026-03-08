import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './ParticleCanvas.css'

gsap.registerPlugin(ScrollTrigger)

function ParticleCanvas() {
  const mountRef = useRef(null)

  useEffect(() => {
    // --- SCENE SETUP ---
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x030308, 0.008)

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 12

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // --- PARTICLE SYSTEM CONFIG ---
    const particleCount = 30000
    const geometry = new THREE.BufferGeometry()

    // Buffers
    const positions = new Float32Array(particleCount * 3)
    const targetPositions = new Float32Array(particleCount * 3)
    const startColors = new Float32Array(particleCount * 3)
    const targetColors = new Float32Array(particleCount * 3)
    const randoms = new Float32Array(particleCount)

    // Indices array for shuffling shape vs background particles
    const particleIndices = new Int32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      particleIndices[i] = i
    }

    // Fisher-Yates shuffle
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
      }
    }

    // Initialize with random scatter
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40

      startColors[i * 3] = 0.1
      startColors[i * 3 + 1] = 0.1
      startColors[i * 3 + 2] = 0.1

      randoms[i] = Math.random()
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(targetPositions, 3))
    geometry.setAttribute('aStartColor', new THREE.BufferAttribute(startColors, 3))
    geometry.setAttribute('aTargetColor', new THREE.BufferAttribute(targetColors, 3))
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))

    // --- SHADERS ---
    const vertexShader = `
      uniform float uTime;
      uniform float uTransition;
      
      attribute vec3 aTargetPos;
      attribute vec3 aStartColor;
      attribute vec3 aTargetColor;
      attribute float aRandom;
      
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Cubic ease in-out
        float t = uTransition < 0.5 ? 4.0 * uTransition * uTransition * uTransition : 1.0 - pow(-2.0 * uTransition + 2.0, 3.0) / 2.0;

        vColor = mix(aStartColor, aTargetColor, t);
        vec3 pos = mix(position, aTargetPos, t);

        // Explosion effect
        float expansion = sin(t * 3.14159265);
        vec3 dir = normalize(aTargetPos - position + vec3(aRandom, aRandom * 2.0, aRandom * 3.0));
        pos += dir * expansion * (aRandom * 12.0);

        // Continuous noise
        pos.x += sin(uTime * 1.5 + aRandom * 20.0) * 0.15;
        pos.y += cos(uTime * 1.2 + aRandom * 20.0) * 0.15;
        pos.z += sin(uTime * 1.8 + aRandom * 20.0) * 0.15;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Intensity size boost
        float brightness = max(vColor.r, max(vColor.g, vColor.b));
        float intensitySize = pow(brightness, 2.5) * 45.0;

        gl_PointSize = (8.0 * aRandom + 6.0 + intensitySize) / -mvPosition.z;
        vAlpha = 1.0 - (expansion * 0.3);
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 pt = gl_PointCoord - vec2(0.5);
        float r = length(pt);
        if (r > 0.5) discard;
        
        float alpha = pow(1.0 - (r * 2.0), 1.2) * vAlpha;
        
        // White hot core
        float brightness = max(vColor.r, max(vColor.g, vColor.b));
        vec3 coreColor = mix(vec3(1.0), vColor, smoothstep(0.0, 0.4, r * 2.0));
        vec3 finalColor = mix(vColor, coreColor, brightness);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTransition: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // --- SHAPE GENERATORS ---
    const applyAmbient = (pos, col, idx) => {
      pos[idx * 3] = (Math.random() - 0.5) * 80
      pos[idx * 3 + 1] = (Math.random() - 0.5) * 80
      pos[idx * 3 + 2] = (Math.random() - 0.5) * 60 - 15
      col[idx * 3] = 0.2 + Math.random() * 0.25
      col[idx * 3 + 1] = 0.0
      col[idx * 3 + 2] = 0.0
    }

    const generateProcessor = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          let x, y, z
          if (Math.random() > 0.6) {
            let edge = Math.floor(Math.random() * 4)
            let val = (Math.random() - 0.5) * 12
            if (edge === 0) { x = val; y = 6 }
            else if (edge === 1) { x = val; y = -6 }
            else if (edge === 2) { x = 6; y = val }
            else { x = -6; y = val }
            z = (Math.random() - 0.5) * 0.5
          } else {
            x = (Math.floor(Math.random() * 10) - 4.5) * 1.0 + (Math.random() - 0.5) * 0.2
            y = (Math.floor(Math.random() * 10) - 4.5) * 1.0 + (Math.random() - 0.5) * 0.2
            z = 0
          }
          pos[idx * 3] = x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = z
          col[idx * 3] = 0.9 + Math.random() * 0.1
          col[idx * 3 + 1] = Math.random() * 0.15
          col[idx * 3 + 2] = Math.random() * 0.15
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const generateAtom = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          if (i < shapeLimit * 0.2) {
            let r = Math.random() * 2
            let u = Math.random(), v = Math.random()
            let theta = u * 2.0 * Math.PI, phi = Math.acos(2.0 * v - 1.0)
            pos[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
            pos[idx * 3 + 1] = r * Math.cos(phi)
            pos[idx * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
          } else {
            let orbit = Math.floor(Math.random() * 3)
            let t = Math.random() * Math.PI * 2
            let r = 7 + (Math.random() - 0.5) * 0.5
            let x = r * Math.cos(t)
            let y = r * Math.sin(t)
            let z = (Math.random() - 0.5) * 0.5
            let angleX = orbit * (Math.PI / 1.5)
            let y1 = y * Math.cos(angleX) - z * Math.sin(angleX)
            let z1 = y * Math.sin(angleX) + z * Math.cos(angleX)
            let angleY = Math.PI / 4
            let x2 = x * Math.cos(angleY) - z1 * Math.sin(angleY)
            let z2 = x * Math.sin(angleY) + z1 * Math.cos(angleY)
            pos[idx * 3] = x2; pos[idx * 3 + 1] = y1; pos[idx * 3 + 2] = z2
          }
          let isBright = Math.random() > 0.95
          col[idx * 3] = 0.9 + Math.random() * 0.1
          col[idx * 3 + 1] = isBright ? 0.6 : Math.random() * 0.1
          col[idx * 3 + 2] = isBright ? 0.4 : 0.0
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const generateWifi = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          let wave = Math.floor(Math.random() * 4)
          if (wave === 0) {
            let r = Math.random() * 1.5
            let u = Math.random(), v = Math.random()
            let theta = u * 2.0 * Math.PI, phi = Math.acos(2.0 * v - 1.0)
            pos[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
            pos[idx * 3 + 1] = r * Math.cos(phi) - 4
            pos[idx * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
          } else {
            let r = wave * 3.0 + 1.0
            let t = (Math.random() - 0.5) * Math.PI * 0.7
            let thickness = (Math.random() - 0.5) * 0.6
            pos[idx * 3] = (r + thickness) * Math.sin(t)
            pos[idx * 3 + 1] = (r + thickness) * Math.cos(t) - 4
            pos[idx * 3 + 2] = (Math.random() - 0.5) * 1.0
          }
          col[idx * 3] = 0.95 + Math.random() * 0.05
          col[idx * 3 + 1] = Math.random() * 0.2
          col[idx * 3 + 2] = Math.random() * 0.2
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const generateCyberGlobe = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          let u = Math.random()
          let v = Math.random()
          let theta = u * 2.0 * Math.PI
          let phi = Math.acos(2.0 * v - 1.0)
          if (Math.random() > 0.3) theta = Math.round(theta * 16) / 16
          if (Math.random() > 0.5) phi = Math.round(phi * 12) / 12
          let r = 7 + (Math.random() - 0.5) * 0.4
          pos[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
          pos[idx * 3 + 1] = r * Math.cos(phi)
          pos[idx * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
          let isNode = Math.random() > 0.95
          col[idx * 3] = isNode ? 1.0 : 0.6 + Math.random() * 0.4
          col[idx * 3 + 1] = isNode ? 0.9 : 0.0
          col[idx * 3 + 2] = isNode ? 0.9 : 0.0
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const generateDataNetwork = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      const nodes = []
      for (let i = 0; i < 15; i++) {
        nodes.push({
          x: (Math.random() - 0.5) * 16,
          y: (Math.random() - 0.5) * 16,
          z: (Math.random() - 0.5) * 16,
          r: Math.random() * 2.5 + 0.5
        })
      }
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          let node = nodes[i % nodes.length]
          if (Math.random() > 0.7) {
            let node2 = nodes[(i + 1) % nodes.length]
            let lerp = Math.random()
            pos[idx * 3] = node.x * lerp + node2.x * (1 - lerp) + (Math.random() - 0.5) * 0.2
            pos[idx * 3 + 1] = node.y * lerp + node2.y * (1 - lerp) + (Math.random() - 0.5) * 0.2
            pos[idx * 3 + 2] = node.z * lerp + node2.z * (1 - lerp) + (Math.random() - 0.5) * 0.2
          } else {
            let u = Math.random(), v = Math.random()
            let theta = u * 2.0 * Math.PI, phi = Math.acos(2.0 * v - 1.0)
            let r = node.r * Math.cbrt(Math.random())
            pos[idx * 3] = node.x + r * Math.sin(phi) * Math.cos(theta)
            pos[idx * 3 + 1] = node.y + r * Math.cos(phi)
            pos[idx * 3 + 2] = node.z + r * Math.sin(phi) * Math.sin(theta)
          }
          col[idx * 3] = 0.8 + Math.random() * 0.2
          col[idx * 3 + 1] = 0.0
          col[idx * 3 + 2] = 0.05
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const generateInfinity = (pos, col, count, indices) => {
      const shapeLimit = Math.floor(count * 0.55)
      for (let i = 0; i < count; i++) {
        let idx = indices ? indices[i] : i
        if (i < shapeLimit) {
          let t = Math.random() * Math.PI * 2
          let a = 8
          pos[idx * 3] = a * Math.sin(t) + (Math.random() - 0.5) * 1.5
          pos[idx * 3 + 1] = a * Math.sin(t) * Math.cos(t) + (Math.random() - 0.5) * 1.5
          pos[idx * 3 + 2] = Math.sin(t * 3) * 2 + (Math.random() - 0.5) * 1.5
          col[idx * 3] = 0.9 + Math.random() * 0.1
          col[idx * 3 + 1] = Math.random() * 0.05
          col[idx * 3 + 2] = Math.random() * 0.1
        } else {
          applyAmbient(pos, col, idx)
        }
      }
    }

    const SHAPES = [
      { name: "Core Processor", generator: generateProcessor },
      { name: "Quantum Atom", generator: generateAtom },
      { name: "Signal Wave", generator: generateWifi },
      { name: "Cyber Globe", generator: generateCyberGlobe },
      { name: "Data Network", generator: generateDataNetwork },
      { name: "Infinite Loop", generator: generateInfinity }
    ]

    let currentShapeIndex = 0
    let isTransitioning = false

    // --- LOGIC ---
    const switchShape = (direction) => {
      if (isTransitioning) return
      isTransitioning = true

      // If direction is 0, use currentShapeIndex directly, otherwise calculate new index
      if (direction !== 0) {
        currentShapeIndex = (currentShapeIndex + direction + SHAPES.length) % SHAPES.length
      }

      const currentPosAttr = geometry.attributes.position.array
      const currentStartColAttr = geometry.attributes.aStartColor.array
      const targetPosAttr = geometry.attributes.aTargetPos.array
      const targetColAttr = geometry.attributes.aTargetColor.array

      for (let i = 0; i < particleCount * 3; i++) {
        currentPosAttr[i] = targetPosAttr[i]
        currentStartColAttr[i] = targetColAttr[i]
      }

      shuffleArray(particleIndices)
      SHAPES[currentShapeIndex].generator(targetPosAttr, targetColAttr, particleCount, particleIndices)

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aStartColor.needsUpdate = true
      geometry.attributes.aTargetPos.needsUpdate = true
      geometry.attributes.aTargetColor.needsUpdate = true
      material.uniforms.uTransition.value = 0.0
    }

    // Initial Load
    shuffleArray(particleIndices)
    SHAPES[0].generator(targetPositions, targetColors, particleCount, particleIndices)
    geometry.attributes.aTargetPos.needsUpdate = true
    geometry.attributes.aTargetColor.needsUpdate = true
    isTransitioning = true

    // --- INTERACTION ---
    let mouseX = 0
    let mouseY = 0
    let targetRotationX = 0
    let targetRotationY = 0

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1
    }

    // Section-based shape switching using Intersection Observer
    let sectionObserver = null
    
    const observeSections = () => {
      const sections = document.querySelectorAll('[data-particle-shape]')
      
      const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      }

      const observerCallback = (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const shapeIndex = parseInt(entry.target.dataset.particleShape)
            if (shapeIndex !== currentShapeIndex && !isTransitioning) {
              currentShapeIndex = shapeIndex
              switchShape(0) // Pass 0 to directly set the shape
            }
          }
        })
      }

      sectionObserver = new IntersectionObserver(observerCallback, observerOptions)
      
      sections.forEach(section => sectionObserver.observe(section))
    }

    // Start observing sections after a short delay to ensure DOM is ready
    setTimeout(() => {
      observeSections()
    }, 100)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onResize)

    // --- ANIMATION ---
    const clock = new THREE.Clock()
    let baseRotation = 0
    let animationId

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.1)

      material.uniforms.uTime.value += delta

      if (isTransitioning) {
        material.uniforms.uTransition.value += delta * 0.6
        if (material.uniforms.uTransition.value >= 1.0) {
          material.uniforms.uTransition.value = 1.0
          isTransitioning = false
        }
      }

      baseRotation += delta * 0.1
      targetRotationY = baseRotation + mouseX * 0.5
      targetRotationX = mouseY * 0.3

      particles.rotation.y += (targetRotationY - particles.rotation.y) * 5 * delta
      particles.rotation.x += (targetRotationX - particles.rotation.x) * 5 * delta

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animationId)
      
      if (sectionObserver) {
        sectionObserver.disconnect()
      }
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="particle-canvas" />
}

export default ParticleCanvas