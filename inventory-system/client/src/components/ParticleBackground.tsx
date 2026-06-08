import React from 'react'
import './ParticleBackground.css'

interface ParticleBackgroundProps {
  count?: number
  color?: string
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  count = 50,
  color = '#1890ff'
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }))

  return (
    <div className="particle-background">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            backgroundColor: color,
            boxShadow: `0 0 ${particle.size * 2}px ${color}`,
          }}
        />
      ))}
      <div className="grid-overlay" />
    </div>
  )
}

export default ParticleBackground
