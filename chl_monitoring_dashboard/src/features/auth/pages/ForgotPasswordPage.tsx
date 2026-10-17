import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { paths } from '@/config/paths'
import { isApiError } from '@/shared/api/api-error'
import { authApi } from '../auth.api'
import { AuthLayout } from '../components/AuthLayout'
import styles from '../components/form.module.css'

const emailSchema = z.email('Enter a valid email address.')

/** Starts the existing CHL forgot-password process; passwords are never changed here. */
export function ForgotPasswordPage() {
  const id = useId()
  const [fieldError, setFieldError] = useState<string | null>(null)
  const reset = useMutation({ mutationFn: (email: string) => authApi.requestPasswordReset(email) })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = emailSchema.safeParse(new FormData(event.currentTarget).get('email'))
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.')
      return
    }
    setFieldError(null)
    reset.mutate(parsed.data)
  }

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Reset your password"
      description="Enter the email address of your CHL account."
    >
      {reset.isSuccess ? (
        <div className={styles.form}>
          <p className={styles.notice} role="status">
            If that email belongs to a CHL account, it will receive instructions to reset the
            password.
          </p>
          <Link className={`${styles.textLink} ${styles.backLink}`} to={paths.signIn}>
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {reset.isError && (
            <p className={styles.alert} role="alert">
              {isApiError(reset.error) ? reset.error.message : 'The request failed. Try again.'}
            </p>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${id}-email`}>
              Email Address
            </label>
            <input
              id={`${id}-email`}
              className={styles.input}
              name="email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? `${id}-email-error` : undefined}
              required
            />
            {fieldError && (
              <span id={`${id}-email-error`} className={styles.fieldError}>
                {fieldError}
              </span>
            )}
          </div>
          <button type="submit" className={styles.submit} disabled={reset.isPending}>
            {reset.isPending ? 'Sending…' : 'Send Reset Instructions'}
          </button>
          <Link className={`${styles.textLink} ${styles.backLink}`} to={paths.signIn}>
            Back to Sign In
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
