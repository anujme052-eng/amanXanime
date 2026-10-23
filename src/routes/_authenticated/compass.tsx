import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Compass as CompassIcon, LocateFixed, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compass")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Compass — amanXanime" },
      { name: "description", content: "Apki location ka compass — NL aur EL aapki hi screen par." },
      { property: "og:title", content: "Compass — amanXanime" },
      { property: "og:description", content: "Compass aur apni location dekhein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompassPage,
});

type Fix = { lat: number; lon: number; acc: number };

function CompassPage() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      window.removeEventListener("deviceorientationabsolute", onOrientation, true);
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOrientation(e: DeviceOrientationEvent) {
    const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
      .webkitCompassHeading;
    if (typeof webkit === "number" && !Number.isNaN(webkit)) {
      setHeading(webkit);
    } else if (e.absolute && typeof e.alpha === "number" && !Number.isNaN(e.alpha)) {
      setHeading((360 - e.alpha) % 360);
    }
  }

  function start() {
    if (started.current) return;
    started.current = true;
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Is browser me location ki suvidha nahi hai.");
      started.current = false;
      return;
    }
    navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission nahi mili — browser settings me permission de kar dobara try karein."
            : "Location nahi mil paayi. Khule aasman me ho to behtar kaam karta hai."
        );
        started.current = false;
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    watchId.current = navigator.geolocation.watchPosition(() => {}, () => {}, { maximumAge: 60000 });

    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    setRunning(true);
  }

  const displayHeading = heading ?? 0;
  const dirName =
    displayHeading >= 337.5 || displayHeading < 22.5
      ? "Uttar (N)"
      : displayHeading < 67.5
        ? "Poore (NE)"
        : displayHeading < 112.5
          ? "Poorva (E)"
          : displayHeading < 157.5
            ? "Agne (SE)"
            : displayHeading < 202.5
              ? "Dakshin (S)"
              : displayHeading < 247.5
                ? "Nairutya (SW)"
                : displayHeading < 292.5
                  ? "Pashchim (W)"
                  : "Vayavya (NW)";

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Wapas videos
      </Link>

      <h1 className="mt-4 flex items-center gap-2 text-xl font-bold">
        <CompassIcon className="h-5 w-5 text-primary" /> Compass
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aapki apni location aur disha — sirf aapki screen par dikhegi, kuch save nahi hota.
      </p>

      {!running && (
        <button
          type="button"
          onClick={start}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LocateFixed className="h-4 w-4" /> Compass on karein
        </button>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {running && (
        <>
          <div className="relative mx-auto mt-6 h-64 w-64 rounded-full border-2 border-border bg-card">
            <div
              className="absolute inset-0 rounded-full transition-transform duration-200"
              style={{ transform: `rotate(${-displayHeading}deg)` }}
            >
              <span className="absolute left-1/2 top-2 -translate-x-1/2 text-sm font-bold text-destructive">
                N
              </span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold">
                E
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-semibold">
                S
              </span>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-semibold">
                W
              </span>
            </div>
            <div className="absolute inset-x-0 top-4 flex justify-center">
              <div className="h-24 w-0.5 bg-primary" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>

          <p className="mt-3 text-center text-sm font-semibold">
            {heading === null ? "Disha mil rahi hai…" : `${Math.round(displayHeading)}° · ${dirName}`}
          </p>

          <div className="mt-5 space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">NL (North Latitude)</span>
              <span className="text-sm font-mono">
                {fix ? `${fix.lat.toFixed(6)}° N` : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">EL (East Longitude)</span>
              <span className="text-sm font-mono">
                {fix ? `${fix.lon.toFixed(6)}° E` : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </span>
            </div>
            {fix && (
              <p className="pt-1 text-xs text-muted-foreground">
                Sahiyya: ±{Math.round(fix.acc)} meter
              </p>
            )}
          </div>
          {!heading && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Disha ke liye phone me magnetometer hona zaroori hai — purane phone me sirf NL aur EL
              dikhenge.
            </p>
          )}
        </>
      )}
    </main>
  );
}
