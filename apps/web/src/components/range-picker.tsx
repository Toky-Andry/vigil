import { SegmentedControl } from "@/components/segmented-control";
import type { RangeKey } from "@/lib/api";

const OPTIONS = (["1h", "6h", "24h", "7d"] as const).map((r) => ({ value: r, label: r }));

type Props = { value: RangeKey; onChange: (r: RangeKey) => void };

export function RangePicker({ value, onChange }: Props) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />;
}
