import { SummitScene } from './SummitScene';

import './brand.css';

/**
 * The landing page's brand layer: the summit scene, decorative only. It is
 * hidden from assistive tech, ignores the pointer, and its motion stops under
 * `prefers-reduced-motion`.
 */
export function GoatBackdrop() {
  return (
    <div className="gb-root" aria-hidden="true">
      <SummitScene className="gb-art" />
    </div>
  );
}
