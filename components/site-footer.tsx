import Image from "next/image";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <a className={styles.footerLink} href="https://arjun.systems" target="_blank" rel="noreferrer">
        <Image
          className={`${styles.footerIcon} ${styles.footerIconLarge}`}
          src="/systems%20site%20icon.png"
          alt="Arjun Systems"
          width={26}
          height={26}
        />
        <span className={styles.footerLinkText}>arjun.systems</span>
      </a>
      <span className={styles.footerDivider}>{"//"}</span>
      <a className={styles.footerLink} href="https://arjuniyer.dev" target="_blank" rel="noreferrer">
        <Image className={styles.footerIcon} src="/personal%20site%20icon.png" alt="Arjun Iyer" width={20} height={20} />
        <span className={styles.footerLinkText}>arjuniyer.dev</span>
      </a>
    </footer>
  );
}
