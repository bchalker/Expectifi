import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  MapFilters,
  ScoredMapCity,
} from "../../lib/whereToRetire/cityMapScoring";
import {
  toggleBudgetPinBand,
  toggleExpatCommunityTier,
  toggleScorePinBand,
  type BudgetLegendBandId,
  type ExpatLegendTierId,
  type ScoreLegendBandId,
} from "../../lib/whereToRetire/cityMapScoring";
import {
  buildCitiesGeoJson,
  clearWtrCityHoverState,
  ensureWtrCityLayers,
  updateWtrCityLayerData,
  WTR_CITIES_LAYER,
  WTR_CITIES_SOURCE,
} from "../../lib/whereToRetire/wtrMapCityLayers";
import {
  resolveMapPinDisplay,
  type MapPinColorView,
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
  detailPanelOpen: boolean;
  suppressTooltips?: boolean;
  fitKey: string;
  onSelect: (id: string) => void;
};

type TooltipState = {
  cityId: string;
  x: number;
  y: number;
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

function cityIdFromEvent(event: MapLayerMouseEvent): string | null {
  const feature = event.features?.[0];
  const cityId = feature?.properties?.cityId;
  return typeof cityId === "string" ? cityId : null;
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
  const cityLayerHandlersAttachedRef = useRef(false);
  const hoveredCityIdRef = useRef<string | null>(null);
  const tooltipPortalRef = useRef<HTMLDivElement>(null);
  const destinationsRef = useRef(destinations);
  const onSelectRef = useRef(onSelect);
  const monthlyIncomeRef = useRef(monthlyIncome);
  const pinColorViewRef = useRef(pinColorView);
  const filtersRef = useRef(filters);
  const hideTooltipTimeoutRef = useRef<number | null>(null);
  const enterTooltipFrameRef = useRef<number | null>(null);
  const detailPanelOpenRef = useRef(detailPanelOpen);
  const suppressTooltipsRef = useRef(suppressTooltips);
  const dismissTooltipRef = useRef<(immediate?: boolean) => void>(() => {});
  const openTooltipRef = useRef<(cityId: string, x: number, y: number) => void>(() => {});
  const prevFocusIdForBoundsRef = useRef<string | null>(null);
  const prevFitKeyRef = useRef(fitKey);
  const hasAutoFitRef = useRef(false);
  const styleIndexRef = useRef(0);
  const switchedStyleRef = useRef(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const legendActiveBands =
    pinColorView === "score"
      ? filters.scorePinBands
      : pinColorView === "budget"
        ? filters.budgetPinBands
        : filters.expatCommunityTiers;

  const handleToggleLegendBand = useCallback(
    (bandClass: string) => {
      if (pinColorView === "score") {
        onFiltersChange({
          ...filters,
          scorePinBands: toggleScorePinBand(
            filters.scorePinBands,
            bandClass as ScoreLegendBandId,
          ),
        });
        return;
      }
      if (pinColorView === "budget") {
        onFiltersChange({
          ...filters,
          budgetPinBands: toggleBudgetPinBand(
            filters.budgetPinBands,
            bandClass as BudgetLegendBandId,
          ),
        });
        return;
      }
      onFiltersChange({
        ...filters,
        expatCommunityTiers: toggleExpatCommunityTier(
          filters.expatCommunityTiers,
          bandClass as ExpatLegendTierId,
        ),
      });
    },
    [filters, onFiltersChange, pinColorView],
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

  const citiesGeoJson = useMemo(
    () => buildCitiesGeoJson(destinations, pinDisplays, focusId),
    [destinations, pinDisplays, focusId],
  );
  const citiesGeoJsonRef = useRef(citiesGeoJson);
  citiesGeoJsonRef.current = citiesGeoJson;

  destinationsRef.current = destinations;
  onSelectRef.current = onSelect;
  monthlyIncomeRef.current = monthlyIncome;
  pinColorViewRef.current = pinColorView;
  filtersRef.current = filters;
  detailPanelOpenRef.current = detailPanelOpen;
  suppressTooltipsRef.current = suppressTooltips;

  const positionTooltipPortal = (x: number, y: number) => {
    const el = tooltipPortalRef.current;
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };

  dismissTooltipRef.current = (immediate = true) => {
    clearTooltipTimers(hideTooltipTimeoutRef, enterTooltipFrameRef);
    const map = mapRef.current;
    if (map && hoveredCityIdRef.current) {
      clearWtrCityHoverState(map, hoveredCityIdRef.current);
      hoveredCityIdRef.current = null;
    }
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
    positionTooltipPortal(x, y);

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

  const hoveredScored = tooltip
    ? destinations.find((item) => item.city.id === tooltip.cityId)
    : null;
  const hoveredIsFavorite = hoveredScored
    ? favoritedKeySet.has(
        `${hoveredScored.city.city}\u0001${hoveredScored.city.country}`,
      )
    : false;

  const attachCityLayerHandlers = (map: maplibregl.Map) => {
    if (cityLayerHandlersAttachedRef.current) return;
    cityLayerHandlersAttachedRef.current = true;

    map.on("click", WTR_CITIES_LAYER, (event) => {
      if (detailPanelOpenRef.current) return;
      const cityId = cityIdFromEvent(event);
      if (!cityId) return;
      dismissTooltipRef.current(true);
      onSelectRef.current(cityId);
    });

    map.on("mouseenter", WTR_CITIES_LAYER, (event) => {
      if (detailPanelOpenRef.current || suppressTooltipsRef.current) return;
      const cityId = cityIdFromEvent(event);
      const scored = cityId
        ? destinationsRef.current.find((d) => d.city.id === cityId)
        : undefined;
      if (!cityId || !scored) return;

      if (hoveredCityIdRef.current && hoveredCityIdRef.current !== cityId) {
        clearWtrCityHoverState(map, hoveredCityIdRef.current);
      }
      hoveredCityIdRef.current = cityId;
      map.setFeatureState({ source: WTR_CITIES_SOURCE, id: cityId }, { hover: true });
      map.getCanvas().style.cursor = "pointer";

      const { x, y } = projectPinTooltipPosition(
        map,
        scored.city.lng,
        scored.city.lat,
      );
      openTooltipRef.current(cityId, x, y);
    });

    map.on("mouseleave", WTR_CITIES_LAYER, () => {
      map.getCanvas().style.cursor = "";
      if (hoveredCityIdRef.current) {
        clearWtrCityHoverState(map, hoveredCityIdRef.current);
        hoveredCityIdRef.current = null;
      }
      setTooltip((prev) => {
        if (!prev) return prev;
        return { ...prev, visible: false, leaving: true };
      });
      if (hideTooltipTimeoutRef.current != null) {
        window.clearTimeout(hideTooltipTimeoutRef.current);
      }
      hideTooltipTimeoutRef.current = window.setTimeout(() => {
        setTooltip((prev) => (prev?.leaving ? null : prev));
        hideTooltipTimeoutRef.current = null;
      }, TOOLTIP_FADE_MS);
    });
  };

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
      maxTileCacheSize: 80,
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
      cityLayerHandlersAttachedRef.current = false;
      map.setStyle(MAP_STYLE_URLS[nextIndex]);
    };

    const onMapError = (event: { error?: { message?: string } }) => {
      const message = event.error?.message ?? "";
      if (!message) return;
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

    const onStyleReady = () => {
      if (!map.isStyleLoaded()) return;
      ensureWtrCityLayers(map);
      attachCityLayerHandlers(map);
      updateWtrCityLayerData(map, citiesGeoJsonRef.current);
    };

    map.on("load", onStyleReady);
    map.on("styledata", onStyleReady);

    mapRef.current = map;

    return () => {
      map.off("error", onMapError);
      map.off("movestart", onMapInteractionStart);
      map.off("dragstart", onMapInteractionStart);
      map.off("zoomstart", onMapInteractionStart);
      map.off("load", onStyleReady);
      map.off("styledata", onStyleReady);
      clearTooltipTimers(hideTooltipTimeoutRef, enterTooltipFrameRef);
      cityLayerHandlersAttachedRef.current = false;
      hoveredCityIdRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    let resizeTimer: number | undefined;
    let lastWidth = 0;
    let lastHeight = 0;

    const resize = () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const host = container.parentElement;
        if (!host) return;
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w === lastWidth && h === lastHeight) return;
        lastWidth = w;
        lastHeight = h;
        map.resize();
      }, 150);
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
    if (!map || !map.isStyleLoaded()) return;
    updateWtrCityLayerData(map, citiesGeoJson);
  }, [citiesGeoJson]);

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
      positionTooltipPortal(x, y);
    };

    map.on("move", syncPosition);
    map.on("zoom", syncPosition);
    map.on("resize", syncPosition);

    return () => {
      map.off("move", syncPosition);
      map.off("zoom", syncPosition);
      map.off("resize", syncPosition);
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

  const hoverTooltip =
    tooltip && hoveredScored && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tooltipPortalRef}
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
              monthlyIncome={monthlyIncome}
              pinColorView={pinColorView}
              filters={filters}
              isFavoritePin={hoveredIsFavorite}
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
            activeBands={legendActiveBands}
            onToggleBand={handleToggleLegendBand}
          />
        </div>
        <div ref={containerRef} className="wtr-maplibre-map__canvas" />
      </div>
      {hoverTooltip}
    </>
  );
}
