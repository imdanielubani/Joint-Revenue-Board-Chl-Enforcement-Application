import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import shieldIcon from '@/assets/auth/shield-icon.svg'
import { paths } from '@/config/paths'
import { isApiError } from '@/shared/api/api-error'
import { signInSchema } from '../auth.schemas'
import { AuthLayout } from '../components/AuthLayout'
import styles from '../components/form.module.css'
import { useSession } from '../session-context'

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function SignInPage() {
  const { signIn, endReason } = useSession()
  const id = useId()

  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
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
      await signIn({ ...parsed.data, remember: data.get('remember') === 'on' })
    } catch (error) {
      setFormError(isApiError(error) ? error.message : 'Sign-in failed. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Welcome back"
      description="Sign in with your existing CHL credentials to continue."
    >
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
            placeholder="danielubani@jbrchl.gov.test"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${id}-email-error` : undefined}
            required
          />
          {fieldErrors.email && (
            <span id={`${id}-email-error`} className={styles.fieldError}>
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-password`}>
            Password
          </label>
          <div className={styles.passwordRow}>
            <input
              id={`${id}-password`}
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter Your Password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? `${id}-password-error` : undefined}
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-controls={`${id}-password`}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {fieldErrors.password && (
            <span id={`${id}-password-error`} className={styles.fieldError}>
              {fieldErrors.password}
            </span>
          )}
        </div>

        <div className={styles.options}>
          <label className={styles.checkboxLabel}>
            <input className={styles.checkbox} type="checkbox" name="remember" />
            Keep me signed in
          </label>
          <Link className={styles.textLink} to={paths.forgotPassword}>
            Forgotten Password?
          </Link>
        </div>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing In…' : 'Sign In'}
        </button>
      </form>

      <p className={styles.roleNote}>
        <img src={shieldIcon} width={15} height={15} alt="" />
        Your CHL role determines which records and locations you can access
      </p>

      <div className={styles.help}>
        <button
          type="button"
          className={styles.helpButton}
          aria-expanded={showHelp}
          aria-controls={`${id}-help`}
          onClick={() => setShowHelp((shown) => !shown)}
        >
          Need help signing in?
        </button>
        {showHelp && (
          <p id={`${id}-help`} className={styles.helpText}>
            Use the email address and password of your CHL account. If you still can&apos;t sign in,
            contact your CHL administrator.
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
