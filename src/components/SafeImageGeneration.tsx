import { Component, forwardRef, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { ImageGeneration, type ImageGenerationHandle } from 'img-fx'
import { hasWebGL } from '@/lib/webgl'

type Props = ComponentProps<typeof ImageGeneration> & {
  /** Shown instead of the shader when WebGL is unavailable or the effect throws. */
  fallbackSrc: string
  fallbackStyle?: CSSProperties
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * img-fx with a plain-image fallback: without WebGL (blocked by policy, old
 * hardware, a lost context) the effect throws, and without this the whole page
 * would unmount.
 */
export const SafeImageGeneration = forwardRef<ImageGenerationHandle, Props>(function SafeImageGeneration(
  { fallbackSrc, fallbackStyle, className, style, children, ...props },
  ref,
) {
  const fallback = (
    <div
      className={className}
      style={{
        ...style,
        ...fallbackStyle,
        backgroundImage: `url(${fallbackSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {children}
    </div>
  )
  if (!hasWebGL()) return fallback
  return (
    <Boundary fallback={fallback}>
      <ImageGeneration ref={ref} className={className} style={style} {...props}>
        {children}
      </ImageGeneration>
    </Boundary>
  )
})
