import { Card } from "@/components/ui/card";

interface EngagementRanges {
  excellent: number;
  good: number;
  average: number;
  needsHelp: number;
}

interface EngagementDistributionProps {
  ranges: EngagementRanges;
  totalStudents: number;
}

export function EngagementDistribution({ ranges, totalStudents }: EngagementDistributionProps) {
  const getPercentage = (count: number) => 
    totalStudents > 0 ? (count / totalStudents) * 100 : 0;

  return (
    <Card className="p-6">
      <h3 className="font-heading font-semibold text-lg mb-4">
        Engagement Distribution
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Excellent (1000+)</span>
            <span className="font-semibold">{ranges.excellent}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-600" 
              style={{ width: `${getPercentage(ranges.excellent)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Good (500-999)</span>
            <span className="font-semibold">{ranges.good}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600" 
              style={{ width: `${getPercentage(ranges.good)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Average (100-499)</span>
            <span className="font-semibold">{ranges.average}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600" 
              style={{ width: `${getPercentage(ranges.average)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Needs Help (&lt;100)</span>
            <span className="font-semibold">{ranges.needsHelp}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-600" 
              style={{ width: `${getPercentage(ranges.needsHelp)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
