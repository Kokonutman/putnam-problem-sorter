import type { Metadata } from "next";
import { getConfiguredPassword } from "@/lib/auth";
import styles from "@/components/putnam-dashboard.module.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Login | Putnam Proof Trainer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const next = typeof params.next === "string" ? params.next : "/trainer";
  const hasConfiguredPassword = Boolean(getConfiguredPassword());

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden />
      <section className={styles.authShell}>
        <div className={styles.authCard}>
          <p className={styles.eyebrow}>Restricted Access</p>
          <h1 className={styles.heroTitle}>Putnam Proof Trainer</h1>
          <p className={styles.authCopy}>
            Enter the shared password to access the private training workspace.
          </p>

          {!hasConfiguredPassword ? (
            <div className={styles.authMessage}>
              <p className={styles.authErrorTitle}>Password Not Configured</p>
              <p className={styles.authErrorCopy}>
                Set <span className={styles.code}>PUTNAM_DASHBOARD_PASSWORD</span> in your environment, then reload this page.
              </p>
            </div>
          ) : (
            <form action="/auth/login" method="post" className={styles.authForm}>
              <input type="hidden" name="next" value={next} />
              <label className={styles.controlGroup}>
                <span className={styles.controlLabel}>Password</span>
                <input className={styles.select} type="password" name="password" autoFocus required />
              </label>
              {error === "invalid" ? (
                <div className={styles.authMessage}>
                  <p className={styles.authErrorTitle}>Incorrect Password</p>
                  <p className={styles.authErrorCopy}>The password did not match the configured value.</p>
                </div>
              ) : null}
              <button className={styles.authButton} type="submit">
                Unlock Dashboard
              </button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
