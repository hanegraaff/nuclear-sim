import { useCallback, useEffect, useRef } from "react";
import type { CloudPresentation } from "../application/cloudPresentation";
import { paintCloudProfile } from "../rendering/cloud/paintCloudProfile";

/** Separate, noninteractive instrument whose frame follows application time. */
export function CloudProfileMonitor({ state }: { readonly state: CloudPresentation }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    paintCloudProfile(context, width, height, stateRef.current);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);
  useEffect(paint, [paint, state]);

  return (
    <section className="cloud-monitor" aria-label="Animated modeled cloud height" data-cloud-progress={state.progress.toFixed(3)}>
      <header className="cloud-monitor-header">
        <span><i aria-hidden="true" /> CLOUD PROFILE</span>
        <b className="cloud-height-readout">{state.heightLabel}</b>
      </header>
      <canvas ref={canvasRef} className="cloud-profile-canvas" aria-hidden="true" />
      <footer className="cloud-monitor-footer">
        <span>{state.plumeLabel} · {state.phaseLabel}</span>
        <small>{state.qualificationLabel}</small>
      </footer>
    </section>
  );
}
