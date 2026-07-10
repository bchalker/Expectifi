import {
  formatGrowthBarValue,
  hexToRgb,
  type AccountGrowthBarData,
} from "../lib/accountGrowthBar";
import "./AccountGrowthBar.scss";

type AccountGrowthBarProps = {
  data: AccountGrowthBarData;
};

export function AccountGrowthBar({ data }: AccountGrowthBarProps) {
  const rgb = hexToRgb(data.color);

  return (
    <div className="account-growth-bar">
      <div className="account-growth-bar__track">
        {data.segments.map((segment) => (
          <div
            key={segment.age}
            className="account-growth-bar__segment"
            style={{
              flexGrow: segment.flexGrow,
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${segment.opacity})`,
            }}
            data-tip={segment.tip}
          />
        ))}
      </div>
      <span className="account-growth-bar__label account-growth-bar__label--end tabular-nums">
        {formatGrowthBarValue(data.projectedFinal)}
      </span>
    </div>
  );
}
