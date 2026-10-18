import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { env } from '@/config/env'
import { formatShortDateTime } from '@/shared/lib/format'
import styles from './EnforcementMap.module.css'

/** Nigeria, for when no point has a position. */
const NIGERIA: L.LatLngTuple = [9.08, 8.68]
const MAX_FIT_ZOOM = 12

/** An enforcement point on the map, with the one figure its circle is sized by. */
export interface MapPoint {
  id: string
  name: string
  /** The state or FCT it is in. */
  area: string
  code: string
  /** Where its events were recorded (GPS); null when CHL has none. Not a live position. */
  position: { lat: number; lng: number } | null
  count: number
  lastRecordedAt: string | null
}

export interface EnforcementMapProps {
  points: readonly MapPoint[]
  /** What a point's figure counts: "9 entries received in this window". */
  countText(count: number): string
  /** The line under the map, saying what the circles mean. */
  legend: string
  /** The panel's main action, such as narrowing the page to the point. */
  primary?: { label: string; run(point: MapPoint): void; enabled?(point: MapPoint): boolean }
  /** A link in the panel; `to` is undefined when the user may not open it. */
  link?: { label: string; to(point: MapPoint): string | undefined }
  /** Follows a link inside the app, without reloading the page. */
  onNavigate(to: string): void
}

type Options = Omit<EnforcementMapProps, 'points'>

/** A token's value, for Leaflet, which takes colours as literals. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** A line of text; built from text nodes, as point names come from the backend. */
function line(parent: HTMLElement, text: string, className?: string) {
  const element = document.createElement('div')
  element.textContent = text
  if (className) element.className = className
  parent.append(element)
}

function lastRecordedText(point: MapPoint) {
  return point.lastRecordedAt
    ? `Last recorded ${formatShortDateTime(point.lastRecordedAt)}`
    : 'Nothing recorded yet'
}

/** The hover label: what the point is, and its figure. */
function tooltip(point: MapPoint, options: { current: Options }): HTMLElement {
  const root = document.createElement('div')
  line(root, point.name, styles.tipName)
  line(root, [point.area, point.code].filter(Boolean).join(' · '), styles.tipMuted)
  line(root, options.current.countText(point.count))
  line(root, `${lastRecordedText(point)} · click for more`, styles.tipMuted)
  return root
}

/** The panel a click opens: the point's figure and what can be done from here. */
function popup(point: MapPoint, options: { current: Options }): HTMLElement {
  const root = document.createElement('div')
  root.className = styles.popup ?? ''
  line(root, point.name, styles.tipName)
  line(root, [point.area, point.code].filter(Boolean).join(' · '), styles.tipMuted)
  line(root, options.current.countText(point.count))
  line(root, lastRecordedText(point), styles.tipMuted)
  line(root, 'Where events were recorded, not a live position.', styles.tipNote)

  const buttons = document.createElement('div')
  buttons.className = styles.popupActions ?? ''
  const { primary, link } = options.current
  if (primary && (primary.enabled?.(point) ?? true)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = styles.popupPrimary ?? ''
    button.textContent = primary.label
    button.addEventListener('click', () => options.current.primary?.run(point))
    buttons.append(button)
  }
  const to = link?.to(point)
  if (link && to) {
    const anchor = document.createElement('a')
    anchor.href = to
    anchor.className = styles.popupLink ?? ''
    anchor.textContent = link.label
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      options.current.onNavigate(to)
    })
    buttons.append(anchor)
  }
  if (buttons.childElementCount > 0) root.append(buttons)
  return root
}

/**
 * Enforcement points at the GPS where their events were recorded, one circle
 * each, larger where the figure is higher and grey where it is nothing. Hover
 * names a point; a click opens its figure and actions. Not live tracking.
 * Loaded on demand, with Leaflet, so the rest of the dashboard stays light.
 */
export default function EnforcementMap({ points, ...options }: EnforcementMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  // Each point's circle, and the panel a click on it opens.
  const markersRef = useRef(new Map<string, { marker: L.CircleMarker; panel: L.Popup }>())
  // The points the circles were drawn for: a refresh updates them in place,
  // keeping the user's pan, zoom and any open panel.
  const drawnRef = useRef('')
  // The latest options, for labels and panels built earlier.
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { scrollWheelZoom: false, zoomSnap: 0.5 })
    map.attributionControl.setPrefix(false)
    L.tileLayer(env.mapTileUrl, { attribution: env.mapAttribution, maxZoom: 18 }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    const markers = markersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      markers.clear()
      drawnRef.current = ''
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    const placed = points.flatMap((point) =>
      point.position
        ? [{ point, at: [point.position.lat, point.position.lng] as L.LatLngTuple }]
        : [],
    )
    const highest = Math.max(1, ...placed.map(({ point }) => point.count))
    const active = token('--color-primary', '#137836')
    const idle = token('--status-neutral-dot', '#9aa5ad')
    const style = (point: MapPoint): L.CircleMarkerOptions => ({
      radius: 7 + 9 * Math.sqrt(point.count / highest),
      color: '#ffffff',
      weight: 2,
      fillColor: point.count > 0 ? active : idle,
      fillOpacity: 0.85,
    })

    const key = placed.map(({ point, at }) => `${point.id}@${at.join(',')}`).join('|')
    const markers = markersRef.current
    if (key === drawnRef.current) {
      // Same places: new figures only.
      for (const { point } of placed) {
        const drawn = markers.get(point.id)
        if (!drawn) continue
        drawn.marker.setStyle(style(point))
        drawn.marker.setTooltipContent(tooltip(point, optionsRef))
        drawn.panel.setContent(popup(point, optionsRef))
      }
      return
    }

    drawnRef.current = key
    map.closePopup()
    layer.clearLayers()
    markers.clear()
    for (const { point, at } of placed) {
      // Opened at the circle's centre, wherever on it the click landed.
      const panel = L.popup({ offset: [0, -4], maxWidth: 260, className: styles.popupFrame ?? '' })
        .setLatLng(at)
        .setContent(popup(point, optionsRef))
      const marker = L.circleMarker(at, style(point)).bindTooltip(tooltip(point, optionsRef), {
        direction: 'top',
        offset: [0, -8],
      })
      marker.on('click', () => {
        // The panel says all the label does; keep only one on screen.
        marker.closeTooltip()
        panel.openOn(map)
      })
      marker.addTo(layer)
      markers.set(point.id, { marker, panel })
    }

    const [first] = placed
    if (!first) map.setView(NIGERIA, 6)
    else if (placed.length === 1) map.setView(first.at, MAX_FIT_ZOOM)
    else {
      map.fitBounds(L.latLngBounds(placed.map(({ at }) => at)), {
        padding: [36, 36],
        maxZoom: MAX_FIT_ZOOM,
      })
    }
  }, [points])

  const unplaced = points.filter((point) => !point.position).length

  return (
    <div className={styles.wrap}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label="Map of recorded event locations"
      />
      <p className={styles.legend}>
        <span className={styles.key} aria-hidden="true" />
        {options.legend}
        {unplaced > 0 &&
          ` ${unplaced} location${unplaced === 1 ? ' has' : 's have'} no recorded position.`}
      </p>
    </div>
  )
}
