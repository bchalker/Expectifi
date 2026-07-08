import { countryToIsoCode } from "../../utils/costOfLiving";

export type CountryFlagSize = "s" | "m" | "l";

type Props = {
  country?: string;
  iso?: string;
  size?: CountryFlagSize;
  className?: string;
};

/** Map app sizes to Tabler flag size classes. */
const SIZE_CLASS: Record<CountryFlagSize, string> = {
  s: "flag-xs",
  m: "flag-sm",
  l: "flag-md",
};

export function resolveTablerFlagCode(iso: string): string | null {
  const normalized = iso.trim().toLowerCase();
  if (normalized.length !== 2) return null;
  return normalized;
}

export function countryFlagCode(country: string): string | null {
  const iso = countryToIsoCode(country);
  return iso ? resolveTablerFlagCode(iso) : null;
}

export function CountryFlag({
  country,
  iso,
  size = "s",
  className,
}: Props) {
  const code =
    (iso ? resolveTablerFlagCode(iso) : null) ??
    (country ? countryFlagCode(country) : null);

  if (!code) return null;

  return (
    <span
      className={[
        "country-flag",
        "flag",
        SIZE_CLASS[size],
        `flag-country-${code}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    />
  );
}
