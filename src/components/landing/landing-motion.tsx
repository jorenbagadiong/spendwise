"use client";

import { useEffect } from "react";

/**
 * Drives the landing page's scroll and pointer effects (SW-011) by writing
 * CSS custom properties straight to the DOM, once per animation frame at
 * most. There's no React state, so scrolling never re-renders anything.
 *
 * - Native scrolling only: nothing is pinned by JS, scroll isn't hijacked,
 *   and scrolling back up simply reverses the effects.
 * - The sticky stage and the tilt only run when they're displayed (desktop)
 *   and the visitor hasn't asked for reduced motion. All content is
 *   server-rendered, so without this script every fact is still on the page.
 */
export function LandingMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const root = document.documentElement;
    const stage = document.querySelector<HTMLElement>("[data-stage]");
    const base = document.querySelector<HTMLElement>("[data-stage-base]");
    const layers = [...document.querySelectorAll<HTMLElement>("[data-layer]")];
    const scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    const tilt = document.querySelector<HTMLElement>("[data-tilt]");
    const hero = document.querySelector<HTMLElement>("[data-hero]");

    let frame = 0;
    let activeScene = -1;

    function sceneFloat(): number {
      // Continuous position of the viewport's middle across the story
      // scenes: 2.0 = middle of scene 2, 2.5 = halfway into scene 3.
      const middle = window.innerHeight / 2;
      for (const [index, el] of scenes.entries()) {
        const rect = el.getBoundingClientRect();
        const n = Number(el.dataset.scene);
        if (index === 0 && middle < rect.top) return n - 1;
        if (middle >= rect.top && middle < rect.bottom) return n + (middle - rect.top) / rect.height - 0.5;
      }
      return Number(scenes.at(-1)?.dataset.scene ?? 0) + 1;
    }

    function update() {
      frame = 0;
      const scrollable = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--page-progress", String(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0));

      if (!stage || reduceMotion.matches || getComputedStyle(stage).display === "none") return;
      const position = sceneFloat();
      let focus = 0;
      for (const layer of layers) {
        const d = Math.max(-1, Math.min(1, position - Number(layer.dataset.layer)));
        // Fully shown for the middle half of its scene, fading at the edges.
        const v = Math.max(0, Math.min(1, (1 - Math.abs(d)) * 2));
        layer.style.setProperty("--v", v.toFixed(3));
        layer.style.setProperty("--d", d.toFixed(3));
        focus = Math.max(focus, v);
      }
      base?.style.setProperty("--focus", focus.toFixed(3));

      const nearest = Math.round(position);
      if (nearest !== activeScene) {
        activeScene = nearest;
        for (const el of scenes) el.toggleAttribute("data-active", Number(el.dataset.scene) === nearest);
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    function onPointerMove(event: PointerEvent) {
      if (!tilt || !hero || reduceMotion.matches || !finePointer.matches) return;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      tilt.style.setProperty("--rx", x.toFixed(3));
      tilt.style.setProperty("--ry", y.toFixed(3));
    }

    function onPointerLeave() {
      tilt?.style.setProperty("--rx", "0");
      tilt?.style.setProperty("--ry", "0");
    }

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduceMotion.addEventListener("change", schedule);
    hero?.addEventListener("pointermove", onPointerMove);
    hero?.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduceMotion.removeEventListener("change", schedule);
      hero?.removeEventListener("pointermove", onPointerMove);
      hero?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return null;
}
