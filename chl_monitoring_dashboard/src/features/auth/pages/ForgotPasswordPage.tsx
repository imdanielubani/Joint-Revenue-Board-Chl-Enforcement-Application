import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
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
    <AuthLayout title="Reset your password">
      {reset.isSuccess ? (
        <div className={styles.form}>
          <p className={styles.notice} role="status">
            If that email belongs to a CHL account, it will receive instructions to reset the
            password.
          </p>
          <Link className={styles.link} to={paths.signIn}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {reset.isError && (
            <p className={styles.alert} role="alert">
              {isApiError(reset.error) ? reset.error.message : 'The request failed. Try again.'}
            </p>
          )}
          <label className={styles.field}>
            Email
            <input
              className={styles.input}
              name="email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(fieldError)}
              required
            />
            {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
          </label>
          <button type="submit" className={styles.submit} disabled={reset.isPending}>
            {reset.isPending ? 'Sending…' : 'Send reset instructions'}
          </button>
          <Link className={styles.link} to={paths.signIn}>
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
