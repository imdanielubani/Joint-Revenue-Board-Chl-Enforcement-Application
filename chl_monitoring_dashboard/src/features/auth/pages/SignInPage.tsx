import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { isApiError } from '@/shared/api/api-error'
import { signInSchema } from '../auth.schemas'
import { AuthLayout } from '../components/AuthLayout'
import styles from '../components/form.module.css'
import { useSession } from '../session-context'

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function SignInPage() {
  const { signIn, endReason } = useSession()

  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const parsed = signInSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
    })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        errors[field] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      // Once signed in, <RedirectIfSignedIn> moves on to the right page.
      await signIn(parsed.data)
    } catch (error) {
      setFormError(isApiError(error) ? error.message : 'Sign-in failed. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Sign in">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {endReason === 'expired' && (
          <p className={styles.notice} role="status">
            Your session has ended. Sign in again to continue.
          </p>
        )}
        {formError && (
          <p className={styles.alert} role="alert">
            {formError}
          </p>
        )}

        <label className={styles.field}>
          Email
          <input
            className={styles.input}
            name="email"
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.email)}
            required
          />
          {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
        </label>

        <label className={styles.field}>
          Password
          <span className={styles.passwordRow}>
            <input
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
          {fieldErrors.password && (
            <span className={styles.fieldError}>{fieldErrors.password}</span>
          )}
        </label>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <Link className={styles.link} to={paths.forgotPassword}>
          Forgot password?
        </Link>
      </form>
    </AuthLayout>
  )
}
