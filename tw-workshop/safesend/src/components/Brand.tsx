import { COPY } from '../copy';
import bannerSrc from '../assets/trustpay-banner.png';

/**
 * The brand artwork, from the Trustpay sheet in src/assets. The `trustpay-*.png`
 * files are that artwork with its opaque white matte solved back out to alpha,
 * so one asset sits correctly on paper and on the indigo dark ground.
 *
 * Only the banner is imported: an unused import still bundles its PNG.
 * `trustpay-mark.png` (the square TP) and `trustpay-lockup.png` (mark over
 * name) are de-matted and waiting in src/assets if either is wanted.
 */

/**
 * The full "Trustpay TP" wordmark, used as the logo in the header.
 *
 * `alt` defaults to the product name, but pass `alt=""` where the name is
 * already announced nearby, so a screen reader does not hear it twice.
 */
export function BrandBanner({
  className = 'h-10 w-auto',
  alt = COPY.app.name,
}: {
  className?: string;
  alt?: string;
}) {
  return <img src={bannerSrc} alt={alt} aria-hidden={alt === '' || undefined} className={className} />;
}
