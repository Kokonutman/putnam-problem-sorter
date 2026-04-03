import Link from "next/link";
import styles from "./page.module.css";
import { SiteFooter } from "@/components/site-footer";

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>Putnam Proof Trainer</p>
          <h1 className={styles.brandTitle}>Calibrated proof practice for serious Putnam prep.</h1>
        </div>
        <nav className={styles.nav}>
          <a className={styles.navLink} href="#product">
            Product
          </a>
          <a className={styles.navLink} href="#workflow">
            Workflow
          </a>
          <a className={styles.navLink} href="#system">
            System
          </a>
          <Link className={styles.secondaryButton} href="/login?next=%2Ftrainer">
            Sign In
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <article className={styles.heroPanel}>
          <div className={styles.launchBadge}>YC energy, proof discipline</div>
          <h2 className={styles.heroTitle}>Train proofs like it is a real operating system.</h2>
          <p className={styles.heroCopy}>
            Putnam Proof Trainer turns the historical archive into a focused practice engine. It tracks work, estimates your level,
            and routes you toward confidence wins, on-level reps, and stretch problems using archived Top N score distributions as
            calibration data.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryButton} href="/trainer">
              Enter Trainer
            </Link>
            <Link className={styles.secondaryButton} href="/login?next=%2Ftrainer">
              Unlock Workspace
            </Link>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaChip}>Static historical dataset</span>
            <span className={styles.metaChip}>Server-side practice state</span>
            <span className={styles.metaChip}>Adaptive difficulty ladder</span>
          </div>
        </article>

        <aside className={styles.frame}>
          <div className={styles.frameHeader}>
            <h3 className={styles.frameTitle}>Training Snapshot</h3>
            <span className={styles.frameBadge}>Private Beta</span>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Mode</p>
              <p className={styles.metricValue}>Practice</p>
              <p className={styles.metricHint}>Daily operating view for active proof work.</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Inputs</p>
              <p className={styles.metricValue}>34Y</p>
              <p className={styles.metricHint}>Historical Putnam score distributions across the available archive.</p>
            </div>
          </div>

          <div className={styles.queuePreview}>
            <div className={styles.queueRow}>
              <div>
                <p className={styles.queueTitle}>Confidence wins</p>
                <p className={styles.queueCopy}>Shorter reps to keep velocity high and proof-writing clean.</p>
              </div>
              <span className={styles.queueStat}>Below level</span>
            </div>
            <div className={styles.queueRow}>
              <div>
                <p className={styles.queueTitle}>On-level problems</p>
                <p className={styles.queueCopy}>The current edge of ability, chosen from the historical archive.</p>
              </div>
              <span className={styles.queueStat}>Core lane</span>
            </div>
            <div className={styles.queueRow}>
              <div>
                <p className={styles.queueTitle}>Stretch problems</p>
                <p className={styles.queueCopy}>Harder pushes that test whether the level estimate should move.</p>
              </div>
              <span className={styles.queueStat}>Up-level</span>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.signalBar}>
        <div className={styles.signalItem}>
          <span className={styles.signalValue}>1</span>
          <span className={styles.signalLabel}>Single-user system</span>
        </div>
        <div className={styles.signalItem}>
          <span className={styles.signalValue}>0</span>
          <span className={styles.signalLabel}>Runtime scraping jobs</span>
        </div>
        <div className={styles.signalItem}>
          <span className={styles.signalValue}>12</span>
          <span className={styles.signalLabel}>Problem slots tracked</span>
        </div>
        <div className={styles.signalItem}>
          <span className={styles.signalValue}>Top N</span>
          <span className={styles.signalLabel}>Calibration population</span>
        </div>
      </section>

      <section id="product" className={styles.section}>
        <div className={styles.sectionPanel}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Built for training, not browsing</h3>
            <p className={styles.sectionCopy}>
              The archive is still there, but the product is organized around practice tracking, difficulty calibration, and next-problem
              selection rather than passive chart consumption.
            </p>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <h4 className={styles.featureTitle}>Practice memory</h4>
              <p className={styles.featureText}>
                Track attempted, partially solved, solved, hinted, abandoned, and archived work with notes, time, and attempt count.
              </p>
            </article>
            <article className={styles.featureCard}>
              <h4 className={styles.featureTitle}>Difficulty calibration</h4>
              <p className={styles.featureText}>
                Use perfect solve rate, nonzero rate, attempt rate, and average score to estimate how demanding each archived problem was.
              </p>
            </article>
            <article className={styles.featureCard}>
              <h4 className={styles.featureTitle}>Adaptive queue</h4>
              <p className={styles.featureText}>
                Get a ladder of recommendations around the current level estimate while keeping the archive available for manual selection.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="workflow" className={styles.section}>
        <div className={styles.sectionPanel}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Simple loop, strong signal</h3>
            <p className={styles.sectionCopy}>
              The product stays narrow on purpose: pick a problem, work it seriously, record the result, and let the queue adjust.
            </p>
          </div>
          <div className={styles.workflow}>
            <article className={styles.step}>
              <p className={styles.stepNumber}>01</p>
              <h4 className={styles.stepTitle}>Open the next problem</h4>
              <p className={styles.stepText}>Use the recommended queue or jump directly to any year and slot in the archive.</p>
            </article>
            <article className={styles.step}>
              <p className={styles.stepNumber}>02</p>
              <h4 className={styles.stepTitle}>Log the attempt cleanly</h4>
              <p className={styles.stepText}>Record status, time, attempts, notes, and whether the result came with hints or solution reading.</p>
            </article>
            <article className={styles.step}>
              <p className={styles.stepNumber}>03</p>
              <h4 className={styles.stepTitle}>Recalibrate</h4>
              <p className={styles.stepText}>Use the historical distribution data to decide whether practice should move down, hold, or push harder.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="system" className={styles.section}>
        <div className={styles.sectionPanel}>
          <div className={styles.bottomCta}>
            <div className={styles.bottomText}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Private training infrastructure</h3>
                <p className={styles.sectionCopy}>
                  Historical data stays static. Practice state persists server-side. The app is password-protected and optimized for one user
                  who wants a disciplined Putnam workflow instead of another dashboard.
                </p>
              </div>
            </div>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryButton} href="/trainer">
                Launch Trainer
              </Link>
              <Link className={styles.secondaryButton} href="/login?next=%2Ftrainer">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
