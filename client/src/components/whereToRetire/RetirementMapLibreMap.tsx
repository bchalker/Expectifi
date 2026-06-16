import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  MapFilters,
  ScoredMapCity,
} from "../../lib/whereToRetire/cityMapScoring";
import {
  toggleExpatCommunityTier,
  type ExpatLegendTierId,
} from "../../lib/whereToRetire/cityMapScoring";
import {
  resolveMapPinDisplay,
  type MapPinColorView,
  type MapPinDisplay,
} from "../../lib/whereToRetire/mapPinDisplay";
import { WtrMapPinLegend } from "./WtrMapPinLegend";
import { WtrMapPinTooltip } from "./WtrMapPinTooltip";
import "./RetirementMapLibreMap.scss";
import "./WtrMapPinLegend.scss";
import "./WtrMapPinTooltip.scss";

const BOUNDS_EASE_DURATION_MS = 900;
const TOOLTIP_FADE_MS = 180;
const MAP_STYLE_URLS = [
  "https://tiles.openfreemap.org/styles/bright/style.json",
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
] as const;

type Props = {
  destinations: ScoredMapCity[];
  monthlyIncome: number;
  pinColorView: MapPinColorView;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  favoritedKeySet: ReadonlySet<string>;
  selectedId: string | null;
  /** When true, emphasize the selected pin; map camera does not move with the detail panel. */
  detailPanelOpen: boolean;
  /** Hide pin hover tooltips (detail panel, filters drawer, etc.). */
  suppressTooltips?: boolean;
  fitKey: string;
  onSelect: (id: string) => void;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  pinEl: HTMLSpanElement;
  cityId: string;
};

type HoveredPin = {
  cityId: string;
  x: number;
  y: number;
};

type TooltipState = HoveredPin & {
  visible: boolean;
  leaving: boolean;
};

function detailFocusId(
  selectedId: string | null,
  detailPanelOpen: boolean,
): string | null {
  return detailPanelOpen && selectedId ? selectedId : null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function whenMapReady(map: maplibregl.Map, run: () => void): () => void {
  if (map.isStyleLoaded()) {
    run();
    return () => {};
  }
  map.once("load", run);
  return () => {
    map.off("load", run);
  };
}

function projectPinTooltipPosition(
  map: maplibregl.Map,
  lng: number,
  lat: number,
): { x: number; y: number } {
  const rect = map.getContainer().getBoundingClientRect();
  const point = map.project([lng, lat]);
  return {
    x: rect.left + point.x,
    y: rect.top + point.y,
  };
}

function applyPinDisplay(
  pinEl: HTMLSpanElement,
  display: MapPinDisplay,
  sizePx: number,
  focusId: string | null,
  cityId: string,
) {
  const isFocused = cityId === focusId;
  pinEl.className = [
    "wtr-map-pin",
    `wtr-map-pin--${display.bandClass}`,
    isFocused && "wtr-map-pin--selected",
    isFocused && "wtr-map-pin--detail",
  ]
    .filter(Boolean)
    .join(" ");
  pinEl.style.width = `${sizePx}px`;
  pinEl.style.height = `${sizePx}px`;
  pinEl.style.background = display.pinColor;
  pinEl.dataset.cityId = cityId;
}

function clearTooltipTimers(
  hideTooltipTimeoutRef: { current: number | null },
  enterTooltipFrameRef: { current: number | null },
) {
  if (hideTooltipTimeoutRef.current != null) {
    window.clearTimeout(hideTooltipTimeoutRef.current);
    hideTooltipTimeoutRef.current = null;
  }
  if (enterTooltipFrameRef.current != null) {
    window.cancelAnimationFrame(enterTooltipFrameRef.current);
    enterTooltipFrameRef.current = null;
  }
}

function syncPinSelection(mapContainer: HTMLElement, focusId: string | null) {
  mapContainer.querySelectorAll<HTMLElement>(".wtr-map-pin").forEach((el) => {
    const id = el.getAttribute("data-city-id");
    const isFocused = id != null && id === focusId;
    el.classList.toggle("wtr-map-pin--selected", isFocused);
    el.classList.toggle("wtr-map-pin--detail", isFocused);
    const markerHost = el.closest(".maplibregl-marker") as HTMLElement | null;
    if (markerHost) {
      markerHost.style.zIndex = isFocused ? "2" : "";
    }
  });
}

export function RetirementMapLibreMap({
  destinations,
  monthlyIncome,
  pinColorView,
  filters,
  onFiltersChange,
  favoritedKeySet,
  selectedId,
  detailPanelOpen,
  suppressTooltips = false,
  fitKey,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new Map<string, MarkerEntry>());
  const pinDisplaysRef = useRef(new Map<string, MapPinDisplay>());
  const destinationsRef = useRef(destinations);
  const onSelectRef = useRef(onSelect);
  const monthlyIncomeRef = useRef(monthlyIncome);
  const pinColorViewRef = useRef(pinColorView);
  const filtersRef = useRef(filters);
  const openTooltipRef = useRef<(cityId: string, x: number, y: number) => void>(() => {});
  const closeTooltipRef = useRef<(cityId: string) => void>(() => {});
  const hideTooltipTimeoutRef = useRef<number | null>(null);
  const enterTooltipFrameRef = useRef<number | null>(null);
  const detailPanelOpenRef = useRef(detailPanelOpen);
  const suppressTooltipsRef = useRef(suppressTooltips);
  const dismissTooltipRef = useRef<(immediate?: boolean) => void>(() => {});
  const prevFocusIdForBoundsRef = useRef<string | null>(null);
  const prevFitKeyRef = useRef(fitKey);
  const hasAutoFitRef = useRef(false);
  const styleIndexRef = useRef(0);
  const switchedStyleRef = useRef(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleToggleExpatTier = useCallback(
    (tier: ExpatLegendTierId) => {
      onFiltersChange({
        ...filters,
        expatCommunityTiers: toggleExpatCommunityTier(
          filters.expatCommunityTiers,
          tier,
        ),
      });
    },
    [filters, onFiltersChange],
  );

  const focusId = detailFocusId(selectedId, detailPanelOpen);

  const pinDisplays = useMemo(
    () =>
      new Map(
        destinations.map((item) => {
          const isFavorite = favoritedKeySet.has(
            `${item.city.city}\u0001${item.city.country}`,
          );
          return [
            item.city.id,
            resolveMapPinDisplay(item, pinColorView, monthlyIncome, isFavorite),
          ];
        }),
      ),
    [destinations, monthlyIncome, pinColorView, favoritedKeySet],
  );

  pinDisplaysRef.current = pinDisplays;
  destinationsRef.current = destinations;
  onSelectRef.current = onSelect;
  monthlyIncomeRef.current = monthlyIncome;
  pinColorViewRef.current = pinColorView;
  filtersRef.current = filters;
  detailPanelOpenRef.current = detailPanelOpen;
  suppressTooltipsRef.current = suppressTooltips;

  dismissTooltipRef.current = (immediate = true) => {
    clearTooltipTimers(hideTooltipTimeoutRef, enterTooltipFrameRef);
    if (immediate) {
      setTooltip(null);
      return;
    }
    setTooltip((prev) => {
      if (!prev) return null;
      return { ...prev, visible: false, leaving: true };
    });
    hideTooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip((prev) => (prev?.leaving ? null : prev));
      hideTooltipTimeoutRef.current = null;
    }, TOOLTIP_FADE_MS);
  };

  openTooltipRef.current = (cityId, x, y) => {
    if (detailPanelOpenRef.current || suppressTooltipsRef.current) return;
    clearTooltipTimers(hideTooltipTimeoutRef, enterTooltipFrameRef);

    setTooltip({ cityId, x, y, visible: false, leaving: false });

    const mountFrame = window.requestAnimationFrame(() => {
      enterTooltipFrameRef.current = window.requestAnimationFrame(() => {
        setTooltip((prev) =>
          prev?.cityId === cityId
            ? { ...prev, visible: true, leaving: false }
            : prev,
        );
        enterTooltipFrameRef.current = null;
      });
    });

    void mountFrame;
  };

  closeTooltipRef.current = (cityId) => {
    setTooltip((prev) => {
      if (!prev || prev.cityId !== cityId) return prev;
      return { ...prev, visible: false, leaving: true };
    });

    if (hideTooltipTimeoutRef.current != null) {
      window.clearTimeout(hideTooltipTimeoutRef.current);
    }

    hideTooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip((prev) =>
        prev?.cityId === cityId && prev.leaving ? null : prev,
      );
      hideTooltipTimeoutRef.current = null;
    }, TOOLTIP_FADE_MS);
  };

  const hoveredScored = tooltip
    ? destinations.find((item) => item.city.id === tooltip.cityId)
    : null;
  const hoveredDisplay = tooltip ? pinDisplays.get(tooltip.cityId) : null;

  useEffect(() => {
    if (!detailPanelOpen && !suppressTooltips) return;
    dismissTooltipRef.current(true);
  }, [detailPanelOpen, suppressTooltips]);

  useEffect(() => {
    const shell = mapShellRef.current;
    if (!shell) return;

    const onPointerLeaveMap = (event: MouseEvent) => {
      const related = event.relatedTarget;
      if (related instanceof Node && shell.contains(related)) return;
      dismissTooltipRef.current(true);
    };

    shell.addEventListener("mouseleave", onPointerLeaveMap);
    return () => shell.removeEventListener("mouseleave", onPointerLeaveMap);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const interactionModes = [
      map.dragPan,
      map.scrollZoom,
      map.boxZoom,
      map.dragRotate,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ] as const;

    if (detailPanelOpen) {
      interactionModes.forEach((mode) => mode.disable());
      return;
    }

    interactionModes.forEach((mode) => mode.enable());
  }, [detailPanelOpen]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URLS[0],
      center: [0, 20],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left",
    );

    const promoteFallbackStyle = () => {
      if (switchedStyleRef.current) return;
      const nextIndex = styleIndexRef.current + 1;
      if (nextIndex >= MAP_STYLE_URLS.length) return;
      switchedStyleRef.current = true;
      styleIndexRef.current = nextIndex;
      map.setStyle(MAP_STYLE_URLS[nextIndex]);
    };

    const onMapError = (event: { error?: { message?: string } }) => {
      const message = event.error?.message ?? "";
      if (!message) return;
      // External tile/style outages should not leave users with a blank map.
      if (
        /style|sprite|glyph|tile|fetch|network|timed out|cors|403|404|5\d{2}/i.test(
          message,
        )
      ) {
        promoteFallbackStyle();
      }
    };

    map.on("error", onMapError);

    const onMapInteractionStart = () => {
      dismissTooltipRef.current(true);
    };
    map.on("movestart", onMapInteractionStart);
    map.on("dragstart", onMapInteractionStart);
    map.on("zoomstart", onMapInteractionStart);

    mapRef.current = map;

    return () => {
      map.off("error", onMapError);
      map.off("movestart", onMapInteractionStart);
      map.off("dragstart", onMapInteractionStart);
      map.off("zoomstart", onMapInteractionStart);
      clearTooltipTimers(hideTooltipTimeoutRef, enterTooltipFrameRef);
      markersRef.current.forEach((entry) => {
        entry.marker.remove();
      });
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    let resizeTimer: number | undefined;

    const resize = () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        map.resize();
      }, 100);
    };

    resize();

    const host = container.parentElement;
    const ro =
      host && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    if (host && ro) ro.observe(host);

    window.addEventListener("resize", resize);
    return () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(destinations.map((item) => item.city.id));

    for (const [cityId, entry] of markersRef.current) {
      if (nextIds.has(cityId)) continue;
      entry.marker.remove();
      markersRef.current.delete(cityId);
    }

    destinations.forEach((item) => {
      const display = pinDisplays.get(item.city.id);
      if (!display) return;

      const cityId = item.city.id;
      let entry = markersRef.current.get(cityId);
      if (!entry) {
        const pinEl = document.createElement("span");
        const host = document.createElement("div");
        host.className = "wtr-map-pin-host";
        host.appendChild(pinEl);

        host.addEventListener("click", () => {
          if (detailPanelOpenRef.current) return;
          dismissTooltipRef.current(true);
          onSelectRef.current(cityId);
        });

        host.addEventListener("mouseenter", () => {
          if (detailPanelOpenRef.current || suppressTooltipsRef.current) return;
          const scored = destinationsRef.current.find(
            (d) => d.city.id === cityId,
          );
          const mapInstance = mapRef.current;
          if (!scored || !mapInstance) return;

          const { x, y } = projectPinTooltipPosition(
            mapInstance,
            scored.city.lng,
            scored.city.lat,
          );
          openTooltipRef.current(cityId, x, y);
        });

        host.addEventListener("mouseleave", () => {
          closeTooltipRef.current(cityId);
        });

        const marker = new maplibregl.Marker({
          element: host,
          anchor: "center",
        })
          .setLngLat([item.city.lng, item.city.lat])
          .addTo(map);

        entry = {
          marker,
          pinEl,
          cityId,
        };
        markersRef.current.set(cityId, entry);
      } else {
        entry.marker.setLngLat([item.city.lng, item.city.lat]);
      }

      applyPinDisplay(entry.pinEl, display, item.pinSizePx, focusId, cityId);
    });
  }, [destinations, pinDisplays, focusId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tooltip || tooltip.leaving) return;

    const syncPosition = () => {
      const scored = destinationsRef.current.find(
        (item) => item.city.id === tooltip.cityId,
      );
      if (!scored) return;

      const { x, y } = projectPinTooltipPosition(
        map,
        scored.city.lng,
        scored.city.lat,
      );
      setTooltip((prev) =>
        prev?.cityId === scored.city.id && !prev.leaving
          ? { ...prev, x, y }
          : prev,
      );
    };

    map.on("move", syncPosition);
    map.on("zoom", syncPosition);
    map.on("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      map.off("move", syncPosition);
      map.off("zoom", syncPosition);
      map.off("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [tooltip?.cityId, tooltip?.leaving]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prevFocus = prevFocusIdForBoundsRef.current;
    prevFocusIdForBoundsRef.current = focusId;

    if (focusId) return;

    const panelJustClosed = prevFocus != null;
    if (panelJustClosed) return;

    const filtersChanged = fitKey !== prevFitKeyRef.current;
    prevFitKeyRef.current = fitKey;

    if (hasAutoFitRef.current && !panelJustClosed && !filtersChanged) return;
    hasAutoFitRef.current = true;

    return whenMapReady(map, () => {
      const reduced = prefersReducedMotion();
      const duration = reduced ? 0 : BOUNDS_EASE_DURATION_MS;
      const visibleDestinations = destinationsRef.current;

      map.stop();

      if (!visibleDestinations.length) {
        map.easeTo({
          center: [0, 20],
          zoom: 2,
          duration: reduced ? 0 : BOUNDS_EASE_DURATION_MS * 0.85,
          essential: true,
        });
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      visibleDestinations.forEach((item) => {
        bounds.extend([item.city.lng, item.city.lat]);
      });

      map.fitBounds(bounds, {
        padding: 40,
        duration,
        maxZoom: 6,
        essential: true,
      });
    });
  }, [fitKey, focusId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const id = window.setTimeout(() => syncPinSelection(container, focusId), 0);
    return () => window.clearTimeout(id);
  }, [focusId, destinations.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let clearEnter: number | undefined;

    const id = window.setTimeout(() => {
      if (destinations.length > 0 && !container.querySelector(".wtr-map-pin"))
        return;

      container.classList.remove("wtr-maplibre-map--pins-enter");
      void container.offsetHeight;
      container.classList.add("wtr-maplibre-map--pins-enter");
      clearEnter = window.setTimeout(() => {
        container.classList.remove("wtr-maplibre-map--pins-enter");
      }, 450);
    }, 50);

    return () => {
      window.clearTimeout(id);
      if (clearEnter != null) window.clearTimeout(clearEnter);
      container.classList.remove("wtr-maplibre-map--pins-enter");
    };
  }, [fitKey, destinations.length]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      destinations.forEach((item) => {
        const entry = markersRef.current.get(item.city.id);
        const display = pinDisplays.get(item.city.id);
        if (!entry || !display) return;
        applyPinDisplay(
          entry.pinEl,
          display,
          item.pinSizePx,
          focusId,
          item.city.id,
        );
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [
    destinations,
    monthlyIncome,
    pinColorView,
    favoritedKeySet,
    pinDisplays,
    focusId,
  ]);

  const hoverTooltip =
    tooltip && hoveredScored && hoveredDisplay && typeof document !== "undefined"
      ? createPortal(
          <div
            className={[
              "wtr-pin-tooltip-portal",
              tooltip.visible && "wtr-pin-tooltip-portal--visible",
              tooltip.leaving && "wtr-pin-tooltip-portal--leaving",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
            }}
            role="tooltip"
          >
            <WtrMapPinTooltip
              scored={hoveredScored}
              display={hoveredDisplay}
              monthlyIncome={monthlyIncome}
              pinColorView={pinColorView}
              filters={filters}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={mapShellRef}
        className={[
          "wtr-maplibre-map",
          detailPanelOpen && "wtr-maplibre-map--detail-open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="wtr-maplibre-map__legend-overlay">
          <WtrMapPinLegend
            view={pinColorView}
            variant="overlay"
            activeExpatTiers={filters.expatCommunityTiers}
            onToggleExpatTier={
              pinColorView === "expat" ? handleToggleExpatTier : undefined
            }
          />
        </div>
        <div ref={containerRef} className="wtr-maplibre-map__canvas" />
      </div>
      {hoverTooltip}
    </>
  );
}
