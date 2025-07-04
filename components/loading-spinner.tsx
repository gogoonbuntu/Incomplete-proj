interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  // 크기에 따른 스타일 결정
  const sizeStyles = {
    sm: 'h-4 w-4 border-b-1',
    md: 'h-8 w-8 border-b-2',
    lg: 'h-12 w-12 border-b-2',
  }
  
  const containerStyles = {
    sm: 'py-2',
    md: 'py-6',
    lg: 'py-12',
  }
  
  return (
    <div className={`flex justify-center items-center ${containerStyles[size]} ${className}`}>
      <div className={`animate-spin rounded-full ${sizeStyles[size]} border-blue-600`}></div>
    </div>
  )
}
