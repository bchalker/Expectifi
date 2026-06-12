import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useIsMobileBottomSheet } from "../../hooks/useMobileBottomSheet";

const HOST_SELECTOR = ".portfolio-accounts-reveal.portfolio-accounts-reveal--in";

type Props = {
  children: ReactNode;
};

/** Desktop: mount scenario slide panels on the portfolio-accounts-reveal column. */
export function PortfolioAccountsScenarioPortal({ children }: Props) {
  const isMobileSheet = useIsMobileBottomSheet();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isMobileSheet || typeof document === "undefined") {
      setHost(null);
      return;
    }
    setHost(document.querySelector(HOST_SELECTOR));
  }, [isMobileSheet]);

  if (isMobileSheet || !host) {
    return <>{children}</>;
  }

  return createPortal(children, host);
}
