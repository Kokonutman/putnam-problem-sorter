import type { Metadata } from "next";
import Image from "next/image";
import { getConfiguredPassword } from "@/lib/auth";
import styles from "@/components/putnam-dashboard.module.css";

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
  const next = typeof params.next === "string" ? params.next : "/";
  const hasConfiguredPassword = Boolean(getConfiguredPassword());

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden />
      <section className={styles.authShell}>
        <div className={styles.authCard}>
          <p className={styles.eyebrow}>Restricted Access</p>
          <h1 className={styles.heroTitle}>Putnam Proof Trainer</h1>
          <p className={styles.authCopy}>
            This dashboard is protected by a single shared password. Access is granted with a secure cookie after login.
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
      <footer className={styles.footer}>
        <a className={styles.footerLink} href="https://arjun.systems" target="_blank" rel="noreferrer">
          <Image
            className={`${styles.footerIcon} ${styles.footerIconLarge}`}
            src="/systems%20site%20icon.png"
            alt="Arjun Systems"
            width={26}
            height={26}
          />
          <span>arjun.systems</span>
        </a>
        <span className={styles.footerDivider}>{"//"}</span>
        <a className={styles.footerLink} href="https://arjuniyer.dev" target="_blank" rel="noreferrer">
          <Image
            className={styles.footerIcon}
            src="/personal%20site%20icon.png"
            alt="Arjun Iyer"
            width={20}
            height={20}
          />
          <span>arjuniyer.dev</span>
        </a>
      </footer>
    </main>
  );
}
