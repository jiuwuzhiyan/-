import React from 'react'
import { Card } from 'antd'
import './GlassCard.css'

interface GlassCardProps {
  children: React.ReactNode
  title?: string
  className?: string
  style?: React.CSSProperties
  hoverable?: boolean
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'none'
  onClick?: () => void
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  title,
  className = '',
  style,
  hoverable = true,
  gradient = 'blue',
  onClick,
}) => {
  const gradientClass = gradient !== 'none' ? `glass-card-gradient-${gradient}` : ''
  const hoverableClass = hoverable ? 'glass-card-hoverable' : ''
  
  return (
    <Card
      className={`glass-card ${gradientClass} ${hoverableClass} ${className}`}
      style={style}
      title={title ? <span className="glass-card-title">{title}</span> : undefined}
      onClick={onClick}
      bordered={false}
    >
      {children}
    </Card>
  )
}

export default GlassCard
