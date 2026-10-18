import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { env } from '@/config/env'
import { formatShortDateTime } from '@/shared/lib/format'
import type { LocationActivity } from '../command-centre.schemas'
import styles from './LocationsMap.module.css'

/** Nigeria, for when no location has a position. */
const NIGERIA: L.LatLngTuple = [9.08, 8.68]
const MAX_FIT_ZOOM = 12

/** A token's value, for Leaflet, which takes colours as literals. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** The tooltip, built from text nodes: location names come from the backend. */
function tooltip(location: LocationActivity): HTMLElement {
  const root = document.createElement('div')
  const line = (text: string, className?: string) => {
    const element = document.createElement('div')
    element.textContent = text
    if (className) element.className = className
    root.append(element)
  }
  line(location.name, styles.tipName)
  line([location.area, location.code].filter(Boolean).join(' · '), styles.tipMuted)
  line(`${location.events} ${location.events === 1 ? 'entry' : 'entries'} received in this window`)
  line(
    location.lastEventAt
      ? `Last recorded ${formatShortDateTime(location.lastEventAt)}`
      : 'Nothing recorded yet',
    styles.tipMuted,
  )
  return root
}

/**
 * Where events were recorded, one circle per enforcement point, larger where
 * more was received. Positions are the GPS of recorded events, not live ones.
 * Loaded on demand, with Leaflet, so the rest of the dashboard stays light.
 */
export default function LocationsMap({ locations }: { locations: readonly LocationActivity[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  // The locations the view was last fitted to: refreshes keep the user's pan and zoom.
  const fittedRef = useRef('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { scrollWheelZoom: false, zoomSnap: 0.5 })
    map.attributionControl.setPrefix(false)
    L.tileLayer(env.mapTileUrl, { attribution: env.mapAttribution, maxZoom: 18 }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      fittedRef.current = ''
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const placed = locations.flatMap((location) =>
      location.position
        ? [{ location, at: [location.position.lat, location.position.lng] as L.LatLngTuple }]
        : [],
    )
    const busiest = Math.max(1, ...placed.map(({ location }) => location.events))
    const active = token('--color-primary', '#137836')
    const idle = token('--status-neutral-dot', '#9aa5ad')
    for (const { location, at } of placed) {
      L.circleMarker(at, {
        radius: 7 + 9 * Math.sqrt(location.events / busiest),
        color: '#ffffff',
        weight: 2,
        fillColor: location.events > 0 ? active : idle,
        fillOpacity: 0.85,
      })
        .bindTooltip(tooltip(location), { direction: 'top', offset: [0, -8] })
        .addTo(layer)
    }

    const key = placed.map(({ location }) => location.id).join('|')
    if (key === fittedRef.current) return
    fittedRef.current = key
    const [first] = placed
    if (!first) map.setView(NIGERIA, 6)
    else if (placed.length === 1) map.setView(first.at, MAX_FIT_ZOOM)
    else {
      map.fitBounds(L.latLngBounds(placed.map(({ at }) => at)), {
        padding: [36, 36],
        maxZoom: MAX_FIT_ZOOM,
      })
    }
  }, [locations])

  const unplaced = locations.filter((location) => !location.position).length

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
        Larger circles: more entries received in this window. Grey: none.
        {unplaced > 0 &&
          ` ${unplaced} location${unplaced === 1 ? ' has' : 's have'} no recorded position.`}
      </p>
    </div>
  )
}
