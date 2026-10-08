const GRAVITY = 1400;
const FRAMES = 12;

/**
 * Shoots gold coins out of `origin` that spin and fall under gravity.
 * Coins live in a fixed layer on <body> because the task row unmounts as soon as it is marked done.
 * With reduced motion, a few coins hop a short way without spinning.
 */
export function burstCoins(origin: Element) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = reduced ? 5 : 14;
  const reach = reduced ? 0.45 : 1;

  const box = origin.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "coin-burst";
  layer.style.left = `${box.left + box.width / 2}px`;
  layer.style.top = `${box.top + box.height / 2}px`;
  document.body.append(layer);

  const animations = Array.from({ length: count }, () => {
    const coin = document.createElement("span");
    coin.className = "coin";
    layer.append(coin);

    const angle = ((-90 + (Math.random() - 0.5) * 110) * Math.PI) / 180;
    const speed = (480 + Math.random() * 300) * Math.sqrt(reach);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const spin = reduced ? 0 : (720 + Math.random() * 720) * (Math.random() < 0.5 ? -1 : 1);
    const size = 0.75 + Math.random() * 0.45;
    const duration = 900 + Math.random() * 400;

    const keyframes = Array.from({ length: FRAMES + 1 }, (_, i) => {
      const t = i / FRAMES;
      const s = (t * duration) / 1000;
      const x = vx * s;
      const y = vy * s + (GRAVITY * reach * s * s) / 2;
      const scale = size * Math.min(1, 0.3 + t * 5);
      return {
        offset: t,
        opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
        transform: `translate(${x}px, ${y}px) rotateY(${spin * t}deg) scale(${scale})`,
      };
    });
    return coin.animate(keyframes, { duration, easing: "linear", fill: "forwards" });
  });

  Promise.all(animations.map((animation) => animation.finished)).finally(() => layer.remove());
}
