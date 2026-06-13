import { Badge } from "@/components/shared/Badge";

interface HerbPropertiesProps {
  natureLabel: string;
  natureColor: string;
  flavorBadges: { label: string; color: string }[];
  meridianLabels: string[];
  dosageRange?: string | null;
  labels: {
    nature: string;
    flavor: string;
    meridian: string;
    dosage: string;
  };
}

export function HerbProperties({
  natureLabel,
  natureColor,
  flavorBadges,
  meridianLabels,
  dosageRange,
  labels,
}: HerbPropertiesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <h4 className="text-xs font-semibold uppercase text-muted mb-2">{labels.nature}</h4>
        <Badge label={natureLabel} color={natureColor} size="md" />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase text-muted mb-2">{labels.flavor}</h4>
        <div className="flex flex-wrap gap-1">
          {flavorBadges.map((f) => (
            <Badge key={f.label} label={f.label} color={f.color} />
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase text-muted mb-2">{labels.meridian}</h4>
        <div className="flex flex-wrap gap-1">
          {meridianLabels.map((m) => (
            <Badge key={m} label={m} color="bg-violet-100 text-violet-800" />
          ))}
        </div>
      </div>
      {dosageRange && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted mb-2">{labels.dosage}</h4>
          <span className="text-sm font-medium">{dosageRange}</span>
        </div>
      )}
    </div>
  );
}
