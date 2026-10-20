import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * The hero intro checklist: "Holder 1" from the Armoury Report Figma file (node 239:1216): a yellow
 * folder holding the daily readiness check card, stamped CHECKED.
 *
 * Laid out at the design's own 558×754 artboard size, then scaled to fit the
 * width of its container so it stays proportional at every screen size.
 */
const W = 558.401
const H = 753.883

const rows = ['Fire truck', 'Ambulance', 'Rescue appliance', 'Operational gear', 'PPE']

const mono: CSSProperties = { fontFamily: "'Courier Prime', ui-monospace, monospace", lineHeight: 'normal' }

export function HeroIntroChecklist({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / W)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label="A yellow folder holding an Armoury daily readiness check card, every item ticked and stamped Checked"
    >
      <div
        aria-hidden
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        {/* Folder back and tab */}
        <div style={{ position: 'absolute', left: 0, top: 29.99, width: W, height: 723.892, display: 'grid', placeItems: 'center' }}>
          <img
            src={`${import.meta.env.BASE_URL}figma/holder-union.svg`}
            alt=""
            width={540}
            height={710}
            style={{ display: 'block', transform: 'rotate(1.5deg)' }}
          />
        </div>

        {/* Index card */}
        <div style={{ position: 'absolute', left: 24.83, top: 1.05, width: 503.073, height: 475.519, display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: 470,
              height: 440,
              boxSizing: 'border-box',
              background: '#f3eee2',
              border: '2px solid #000',
              borderRadius: 4,
              transform: 'rotate(4.5deg)',
              color: '#141414',
            }}
          >
            <p style={{ ...mono, position: 'absolute', left: 26, top: 24, margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 0.56, whiteSpace: 'nowrap' }}>
              ARMOURY / DAILY READINESS CHECK
            </p>
            <div style={{ position: 'absolute', left: 26, top: 60, width: 414, height: 2, background: '#141414' }} />
            {rows.map((label, i) => {
              const top = 86 + i * 54
              return (
                <div key={label}>
                  <p style={{ ...mono, position: 'absolute', left: 26, top, margin: 0, fontSize: 18, whiteSpace: 'nowrap' }}>{label}</p>
                  <div style={{ position: 'absolute', left: 390, top: top + 2, width: 22, height: 22, boxSizing: 'border-box', border: '2px solid #141414' }} />
                  <p style={{ ...mono, position: 'absolute', left: 396, top, margin: 0, fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>x</p>
                  <div style={{ position: 'absolute', left: 26, top: top + 34, width: 414, height: 1, background: '#b9b2a0' }} />
                </div>
              )
            })}
            {/* CHECKED stamp */}
            <div style={{ position: 'absolute', left: 208.84, top: 182.71, width: 196.838, height: 88.142, display: 'grid', placeItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: 190,
                  height: 56,
                  boxSizing: 'border-box',
                  border: '4px solid #c8372d',
                  borderRadius: 6,
                  transform: 'rotate(10deg)',
                }}
              >
                <p
                  style={{
                    ...mono,
                    position: 'absolute',
                    left: -4,
                    top: 8,
                    width: 190,
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: 1.56,
                    color: '#c8372d',
                    textAlign: 'center',
                  }}
                >
                  CHECKED
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Folder front pocket */}
        <div style={{ position: 'absolute', left: 0, top: 354.74, width: 549.897, height: 399.145, display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              width: 540,
              height: 385.142,
              boxSizing: 'border-box',
              background: '#f7e062',
              border: '2px solid #000',
              borderRadius: '100px 18px 18px 18px',
              transform: 'rotate(1.5deg)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
