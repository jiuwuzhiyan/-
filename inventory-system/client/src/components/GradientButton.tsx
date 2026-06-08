import React from 'react'
import { Button } from 'antd'
import type { ButtonProps } from 'antd'
import './GradientButton.css'

interface GradientButtonProps extends ButtonProps {
  gradient?: 'blue' | 'purple' | 'green' | 'red' | 'orange'
  glow?: boolean
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  className = '',
  gradient = 'blue',
  glow = true,
  ...props
}) => {
  const gradientClass = `gradient-btn-${gradient}`
  const glowClass = glow ? 'gradient-btn-glow' : ''
  
  return (
    <Button
      className={`gradient-btn ${gradientClass} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </Button>
  )
}

export default GradientButton
