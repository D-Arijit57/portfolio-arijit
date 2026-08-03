/**
 * Sprint 18 (spec §7.3): "Springs over durations for anything
 * pointer-driven. Interruptible, velocity-preserving, and physically
 * consistent with the object being a physical thing."
 *
 * Critically damped by construction — spec §7.2 asks for parallax with no
 * overshoot, because a sheet of paper settling past its rest position and
 * bouncing back reads as rubber, not paper. Critical damping is the fastest
 * approach to rest that never crosses it.
 *
 * Integrated against real elapsed time rather than per-frame constants, so
 * the settle takes the same wall-clock duration on a 30Hz and a 144Hz
 * display. This matters more than usual here: the renderer is on-demand
 * (spec §10.1), so frame deltas are irregular by design.
 */
export class Spring {
  value: number;
  target: number;
  private velocity = 0;
  private readonly omega: number;

  /**
   * @param value    initial and rest position
   * @param halfLife seconds for the remaining distance to halve — the
   *                 intuitive handle on "how fast does this settle"
   */
  constructor(value: number, halfLife = 0.12) {
    this.value = value;
    this.target = value;
    // Angular frequency of a critically damped system with this half-life.
    this.omega = Math.LN2 / halfLife;
  }

  /** True while the spring is still meaningfully moving — drives render-on-demand. */
  get isSettled(): boolean {
    return Math.abs(this.value - this.target) < 1e-4 && Math.abs(this.velocity) < 1e-4;
  }

  set(target: number) {
    this.target = target;
  }

  /** Snap to a value with no motion — used for reduced motion and hard resets. */
  jump(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  step(dt: number) {
    if (this.isSettled) {
      this.value = this.target;
      this.velocity = 0;
      return this.value;
    }
    // Semi-implicit integration of x'' = -2*w*x' - w^2*(x - target).
    const clamped = Math.min(dt, 1 / 30);
    const displacement = this.value - this.target;
    const acceleration = -this.omega * this.omega * displacement - 2 * this.omega * this.velocity;
    this.velocity += acceleration * clamped;
    this.value += this.velocity * clamped;
    return this.value;
  }
}
