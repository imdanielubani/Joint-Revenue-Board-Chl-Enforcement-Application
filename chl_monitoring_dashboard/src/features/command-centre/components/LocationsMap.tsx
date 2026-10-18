import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useLayoutEffect, useRef } from 'react'
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

/** A line of text; built from text nodes, as location names come from the backend. */
function line(parent: HTMLElement, text: string, className?: string) {
  const element = document.createElement('div')
  element.textContent = text
  if (className) element.className = className
  parent.append(element)
}

function entriesText(location: LocationActivity) {
  return `${location.events} ${location.events === 1 ? 'entry' : 'entries'} received in this window`
}

function lastRecordedText(location: LocationActivity) {
  return location.lastEventAt
    ? `Last recorded ${formatShortDateTime(location.lastEventAt)}`
    : 'Nothing recorded yet'
}

/** The hover label: what the location is, and what it received. */
function tooltip(location: LocationActivity): HTMLElement {
  const root = document.createElement('div')
  line(root, location.name, styles.tipName)
  line(root, [location.area, location.code].filter(Boolean).join(' · '), styles.tipMuted)
  line(root, entriesText(location))
  line(root, `${lastRecordedText(location)} · click for actions`, styles.tipMuted)
  return root
}

interface MapActions {
  /** Narrows the feed to the location's entries. */
  onShowEntries(location: LocationActivity): void
  /** The geographical monitoring page for it, when the user may open that module. */
  linkFor(location: LocationActivity): string | undefined
  /** Follows a link inside the app, without reloading the page. */
  onNavigate(to: string): void
}

/** The panel a click opens: the location's figures and what can be done from here. */
function popup(location: LocationActivity, actions: { current: MapActions }): HTMLElement {
  const root = document.createElement('div')
  root.className = styles.popup ?? ''
  line(root, location.name, styles.tipName)
  line(root, [location.area, location.code].filter(Boolean).join(' · '), styles.tipMuted)
  line(root, entriesText(location))
  line(root, lastRecordedText(location), styles.tipMuted)
  line(root, 'Where events were recorded, not a live position.', styles.tipNote)

  const buttons = document.createElement('div')
  buttons.className = styles.popupActions ?? ''
  if (location.events > 0) {
    const show = document.createElement('button')
    show.type = 'button'
    show.className = styles.popupPrimary ?? ''
    show.textContent = 'Show its entries in the feed'
    show.addEventListener('click', () => actions.current.onShowEntries(location))
    buttons.append(show)
  }
  const to = actions.current.linkFor(location)
  if (to) {
    const open = document.createElement('a')
    open.href = to
    open.className = styles.popupLink ?? ''
    open.textContent = 'Open in geographical monitoring'
    open.addEventListener('click', (event) => {
      event.preventDefault()
      actions.current.onNavigate(to)
    })
    buttons.append(open)
  }
  if (buttons.childElementCount > 0) root.append(buttons)
  return root
}

/**
 * Where events were recorded, one circle per enforcement point, larger where
 * more was received. Hover names it; a click opens its figures and actions.
 * Positions are the GPS of recorded events, not live ones. Loaded on demand,
 * with Leaflet, so the rest of the dashboard stays light.
 */
export default function LocationsMap({
  locations,
  ...actions
}: { locations: readonly LocationActivity[] } & MapActions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  // Each point's circle, and the panel a click on it opens.
  const markersRef = useRef(new Map<string, { marker: L.CircleMarker; panel: L.Popup }>())
  // The locations the circles were drawn for: a refresh updates them in place,
  // keeping the user's pan, zoom and any open panel.
  const drawnRef = useRef('')
  // The latest actions, for panels built earlier.
  const actionsRef = useRef(actions)
  useLayoutEffect(() => {
    actionsRef.current = actions
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

    const placed = locations.flatMap((location) =>
      location.position
        ? [{ location, at: [location.position.lat, location.position.lng] as L.LatLngTuple }]
        : [],
    )
    const busiest = Math.max(1, ...placed.map(({ location }) => location.events))
    const active = token('--color-primary', '#137836')
    const idle = token('--status-neutral-dot', '#9aa5ad')
    const style = (location: LocationActivity): L.CircleMarkerOptions => ({
      radius: 7 + 9 * Math.sqrt(location.events / busiest),
      color: '#ffffff',
      weight: 2,
      fillColor: location.events > 0 ? active : idle,
      fillOpacity: 0.85,
    })

    const key = placed.map(({ location, at }) => `${location.id}@${at.join(',')}`).join('|')
    const markers = markersRef.current
    if (key === drawnRef.current) {
      // Same places: new figures only.
      for (const { location } of placed) {
        const drawn = markers.get(location.id)
        if (!drawn) continue
        drawn.marker.setStyle(style(location))
        drawn.marker.setTooltipContent(tooltip(location))
        drawn.panel.setContent(popup(location, actionsRef))
      }
      return
    }

    drawnRef.current = key
    map.closePopup()
    layer.clearLayers()
    markers.clear()
    for (const { location, at } of placed) {
      // Opened at the circle's centre, wherever on it the click landed.
      const panel = L.popup({ offset: [0, -4], maxWidth: 260, className: styles.popupFrame ?? '' })
        .setLatLng(at)
        .setContent(popup(location, actionsRef))
      const marker = L.circleMarker(at, style(location)).bindTooltip(tooltip(location), {
        direction: 'top',
        offset: [0, -8],
      })
      marker.on('click', () => {
        // The panel says all the label does; keep only one on screen.
        marker.closeTooltip()
        panel.openOn(map)
      })
      marker.addTo(layer)
      markers.set(location.id, { marker, panel })
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
        Larger circles: more entries received in this window. Grey: none. Click a circle for its
        entries.
        {unplaced > 0 &&
          ` ${unplaced} location${unplaced === 1 ? ' has' : 's have'} no recorded position.`}
      </p>
    </div>
  )
}
