import Flag from "react-flagpack";
import { countryToIsoCode } from "../../utils/costOfLiving";
import "./CountryFlag.scss";

export type CountryFlagSize = "s" | "m" | "l";

type Props = {
  country?: string;
  iso?: string;
  size?: CountryFlagSize;
  className?: string;
  hasBorder?: boolean;
  hasBorderRadius?: boolean;
  hasDropShadow?: boolean;
};

const FLAGPACK_ISO_ALIASES: Record<string, string> = {
  GB: "GBR",
};

export function resolveFlagpackCode(iso: string): string | null {
  const normalized = iso.trim().toUpperCase();
  if (normalized.length !== 2) return null;
  return FLAGPACK_ISO_ALIASES[normalized] ?? normalized;
}

export function countryFlagCode(country: string): string | null {
  const iso = countryToIsoCode(country);
  return iso ? resolveFlagpackCode(iso) : null;
}

export function CountryFlag({
  country,
  iso,
  size = "s",
  className,
  hasBorder = true,
  hasBorderRadius = true,
  hasDropShadow = true,
}: Props) {
  const code =
    (iso ? resolveFlagpackCode(iso) : null) ??
    (country ? countryFlagCode(country) : null);

  if (!code) return null;

  return (
    <span
      className={["country-flag", `country-flag--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <Flag
        code={code as never}
        size={size}
        hasBorder={hasBorder}
        hasBorderRadius={hasBorderRadius}
        hasDropShadow={hasDropShadow}
      />
    </span>
  );
}
