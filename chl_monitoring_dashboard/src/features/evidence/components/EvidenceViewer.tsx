import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { gpsText } from '@/features/geography/record-details'
import { formatDateTime } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import {
  GROUP_LABELS,
  groupOf,
  photoLabel,
  placeText,
  type EvidenceGroup,
} from '../evidence-display'
import type { EvidenceEntry, Photograph } from '../evidence.schemas'
import styles from './EvidenceCards.module.css'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 id={id} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** "Vehicle evidence · Front"; a kind the dashboard does not know shows on its own. */
const photoTitle = (photo: Photograph) => {
  const group = groupOf(photo.kind)
  return group ? `${GROUP_LABELS[group]} · ${photoLabel(photo.kind)}` : photoLabel(photo.kind)
}

/**
 * The evidence for one violation (SRD 9): the photograph viewer, the metadata
 * captured with each photograph, the agent's notes and the related records.
 * Read-only: nothing here uploads, replaces or edits evidence.
 */
export function EvidenceViewer({
  entry,
  startGroup,
  onClose,
}: {
  entry: EvidenceEntry
  /** The kind of evidence to show first, as the tab it was opened from. */
  startGroup: EvidenceGroup | null
  onClose(): void
}) {
  const link = useModuleLink()
  // In the order shown: vehicle evidence, then E-Tag evidence, then any other kind.
  const rank = (photo: Photograph) => {
    const group = groupOf(photo.kind)
    return group === 'vehicle' ? 0 : group === 'etag' ? 1 : 2
  }
  const photos = [...entry.photographs].sort((a, b) => rank(a) - rank(b))
  const firstOfGroup = startGroup
    ? photos.findIndex((photo) => groupOf(photo.kind) === startGroup)
    : -1
  const [index, setIndex] = useState(Math.max(0, firstOfGroup))
  const photo = photos[index]
  const step = (by: number) =>
    setIndex((current) =>
      photos.length === 0 ? 0 : (current + by + photos.length) % photos.length,
    )
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') step(-1)
    else if (event.key === 'ArrowRight') step(1)
    else return
    event.preventDefault()
  }

  // The thumbnails, grouped as the document groups evidence; any other kind last.
  const groups: { label: string; items: { photo: Photograph; at: number }[] }[] = [
    ...(['vehicle', 'etag'] as const).map((group) => ({
      label: GROUP_LABELS[group],
      items: photos.flatMap((item, at) =>
        groupOf(item.kind) === group ? [{ photo: item, at }] : [],
      ),
    })),
    {
      label: 'Other photographs',
      items: photos.flatMap((item, at) =>
        groupOf(item.kind) === null ? [{ photo: item, at }] : [],
      ),
    },
  ].filter((group) => group.items.length > 0)

  const related = [
    {
      term: 'Vehicle',
      label: entry.vehicleId ? `${entry.plate} · ${entry.vehicleId}` : entry.plate,
      to: link('verifications', `${paths.verifications}?plate=${entry.plate}`),
    },
    {
      term: 'Verification',
      label: entry.verificationReference,
      to: link('verifications', `${paths.verifications}?ref=${entry.verificationReference}`),
    },
    {
      term: 'Violation',
      label: `${entry.violation.id} · ${entry.violation.category}`,
      to: link('violations', `${paths.violations}?case=${entry.violation.id}`),
    },
    {
      term: 'Enforcement location',
      label: `${placeText(entry.location)} · ${entry.location.code}`,
      to: link('geography', `${paths.geography}?scope=${entry.location.id}`),
    },
  ]

  return (
    <Dialog
      wide
      title={`Evidence ${entry.id}`}
      subtitle={`${entry.violation.id} · ${entry.plate} · ${entry.violation.category}`}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <div className={styles.viewer}>
        <Section title="Photograph viewer">
          {photo ? (
            <>
              <div
                className={styles.stage}
                tabIndex={0}
                onKeyDown={onKeyDown}
                aria-label="Photograph; use the left and right arrow keys to move between photographs"
              >
                {photo.url ? (
                  <img
                    className={styles.image}
                    src={photo.url}
                    alt={`${photoTitle(photo)}, ${entry.plate}`}
                  />
                ) : (
                  <p className={styles.uploading}>
                    {photoTitle(photo)}: still uploading from the device.
                  </p>
                )}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.navButton} ${styles.previous}`}
                      aria-label="Previous photograph"
                      onClick={() => step(-1)}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className={`${styles.navButton} ${styles.next}`}
                      aria-label="Next photograph"
                      onClick={() => step(1)}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
              <p className={styles.caption} aria-live="polite">
                <span className={styles.captionTitle}>{photoTitle(photo)}</span>
                <span>
                  {index + 1} of {photos.length}
                </span>
              </p>
              {groups.map((group) => (
                <div key={group.label} className={styles.thumbGroup}>
                  <p className={styles.thumbLabel}>{group.label}</p>
                  <ul className={styles.thumbs}>
                    {group.items.map(({ photo: item, at }) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={styles.thumb}
                          aria-pressed={at === index}
                          aria-label={`${photoTitle(item)}, ${at + 1} of ${photos.length}`}
                          onClick={() => setIndex(at)}
                        >
                          {item.url ? (
                            <img src={item.url} alt="" />
                          ) : (
                            <span className={styles.thumbUploading}>Uploading</span>
                          )}
                          <span className={styles.thumbName}>{photoLabel(item.kind)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.small}>No photographs have been received for this violation.</p>
          )}
        </Section>

        <div className={styles.side}>
          <Section title="Evidence metadata">
            <dl className={styles.facts}>
              <Fact term="Photograph">{photo ? photoTitle(photo) : 'None'}</Fact>
              <Fact term="Capture timestamp">
                {photo ? formatDateTime(photo.capturedAt) : 'Not supplied'}
              </Fact>
              <Fact term="GPS coordinates">{photo ? gpsText(photo.position) : 'Not captured'}</Fact>
              <Fact term="Location">{`${placeText(entry.location)} · ${entry.location.code}`}</Fact>
              <Fact term="Agent">{`${entry.agent.name} · ${entry.agent.id}`}</Fact>
              <Fact term="Violation reference">{entry.violation.id}</Fact>
            </dl>
          </Section>

          <Section title="Enforcement notes">
            {entry.notes.length === 0 ? (
              <p className={styles.small}>No notes were submitted with this evidence.</p>
            ) : (
              <ul className={styles.notes}>
                {entry.notes.map((note) => (
                  <li key={note.id} className={styles.note}>
                    <p>{note.text}</p>
                    <p className={styles.noteBy}>
                      {note.agent.name} · {note.agent.id} · {formatDateTime(note.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Related records">
            <dl className={styles.facts}>
              {related.map((item) => (
                <Fact key={item.term} term={item.term}>
                  {item.to ? (
                    <Link className={styles.relatedLink} to={item.to}>
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </Fact>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      <p className={styles.small}>
        Read-only. Evidence is captured through the mobile camera; the dashboard does not upload
        replacement evidence, edit photographs or alter captured metadata.
      </p>
    </Dialog>
  )
}
