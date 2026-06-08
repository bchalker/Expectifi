import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadTaxSummaryPanelOpen,
  saveTaxSummaryPanelOpen,
} from "../lib/taxSummaryPanelPref";

type TaxSummaryPanelContextValue = {
  showTaxSummary: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
};

const TaxSummaryPanelContext = createContext<TaxSummaryPanelContextValue | null>(null);

export function useTaxSummaryPanelOptional(): TaxSummaryPanelContextValue | null {
  return useContext(TaxSummaryPanelContext);
}

type ProviderProps = {
  showTaxSummary: boolean;
  children: ReactNode;
};

export function TaxSummaryPanelProvider({ showTaxSummary, children }: ProviderProps) {
  const [panelOpen, setPanelOpen] = useState(() => loadTaxSummaryPanelOpen());

  useEffect(() => {
    saveTaxSummaryPanelOpen(panelOpen);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 680px)");
    if (!mq.matches) return;
    document.body.classList.add("tax-summary-panel-open-body");
    return () => document.body.classList.remove("tax-summary-panel-open-body");
  }, [panelOpen]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => !open);
  }, []);

  const value = useMemo(
    (): TaxSummaryPanelContextValue => ({
      showTaxSummary,
      panelOpen,
      openPanel,
      closePanel,
      togglePanel,
    }),
    [showTaxSummary, panelOpen, openPanel, closePanel, togglePanel],
  );

  return (
    <TaxSummaryPanelContext.Provider value={value}>
      {children}
    </TaxSummaryPanelContext.Provider>
  );
}
