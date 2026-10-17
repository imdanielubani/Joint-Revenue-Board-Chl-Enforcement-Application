import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { env } from '@/config/env'
import { isApiError } from '@/shared/api/api-error'
import { assetUrl } from '@/shared/lib/asset-url'
import { useToast } from '@/shared/ui/toast/toast-context'
import { AuthShell } from '../components/AuthLayout'
import { BackToSignIn } from '../components/BackToSignIn'
import { supportApi } from '../support.api'
import {
  ISSUE_TYPE_LABELS,
  ISSUE_TYPES,
  SUPPORT_MESSAGE_MAX_LENGTH,
  supportRequestSchema,
  type SupportRequest,
} from '../support.schemas'
import styles from './SupportPage.module.css'

type Field = keyof SupportRequest
type FieldErrors = Partial<Record<Field, string>>

/** "CHL support": a signed-out user describes a sign-in or access issue for the support team. */
export function SupportPage() {
  const id = useId()
  const { showToast } = useToast()
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const send = useMutation({ mutationFn: (input: SupportRequest) => supportApi.sendRequest(input) })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = supportRequestSchema.safeParse({
      fullName: data.get('fullName'),
      email: data.get('email'),
      issueType: data.get('issueType'),
      message: data.get('message'),
    })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field
        errors[field] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    send.mutate(parsed.data, {
      onSuccess: () => {
        form.reset()
        setMessage('')
        showToast({
          title: 'Email sent',
          lines: [
            'Your message has been sent to CHL support.',
            // On sample data nothing leaves the browser; say so rather than imply an email went out.
            ...(env.useMocks ? ['Success preview only — no email has been sent.'] : []),
          ],
        })
      },
    })
  }

  const describedBy = (field: Field, extra?: string) =>
    [fieldErrors[field] ? `${id}-${field}-error` : null, extra].filter(Boolean).join(' ') ||
    undefined

  const fieldError = (field: Field) =>
    fieldErrors[field] && (
      <span id={`${id}-${field}-error`} className={styles.fieldError}>
        {fieldErrors[field]}
      </span>
    )

  return (
    <AuthShell wide>
      <BackToSignIn className={styles.back} />

      <section className={styles.section} aria-labelledby={`${id}-title`}>
        <h1 id={`${id}-title`} className={styles.sectionTitle}>
          CHL support
        </h1>

        <div className={styles.body}>
          <h2 className={styles.heading}>How can we help?</h2>
          <p className={styles.intro}>
            Describe your sign-in or access issue for the CHL support team.
          </p>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <p className={styles.required}>All fields are required.</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${id}-fullName`}>
                Full name
              </label>
              <input
                id={`${id}-fullName`}
                className={styles.input}
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={describedBy('fullName')}
                required
              />
              {fieldError('fullName')}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${id}-email`}>
                CHL email address
              </label>
              <input
                id={`${id}-email`}
                className={styles.input}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@organization.gov.ng"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={describedBy('email')}
                required
              />
              {fieldError('email')}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${id}-issueType`}>
                Issue type
              </label>
              {/* The empty first option is the placeholder; `required` makes it :invalid until a choice is made. */}
              <select
                id={`${id}-issueType`}
                className={`${styles.input} ${styles.select}`}
                name="issueType"
                defaultValue=""
                aria-invalid={Boolean(fieldErrors.issueType)}
                aria-describedby={describedBy('issueType')}
                required
              >
                <option value="" disabled>
                  What do you need help with?
                </option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ISSUE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {fieldError('issueType')}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${id}-message`}>
                Message
              </label>
              <textarea
                id={`${id}-message`}
                className={styles.textarea}
                name="message"
                placeholder="Describe what happened and how we can help…"
                maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={describedBy('message', `${id}-message-hint ${id}-message-count`)}
                required
              />
              {fieldError('message')}
              <div className={styles.hintRow}>
                <span id={`${id}-message-hint`}>
                  Do not include passwords, verification codes or sensitive records.
                </span>
                <span id={`${id}-message-count`}>
                  {message.length}/{SUPPORT_MESSAGE_MAX_LENGTH}
                </span>
              </div>
            </div>

            {send.isError && (
              <p className={styles.alert} role="alert">
                {isApiError(send.error)
                  ? send.error.message
                  : 'Your message could not be sent. Try again.'}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={send.isPending}>
              <img src={assetUrl('support/send.svg')} width={16} height={16} alt="" />
              {send.isPending ? 'Sending…' : 'Submit'}
            </button>
          </form>
        </div>
      </section>
    </AuthShell>
  )
}
