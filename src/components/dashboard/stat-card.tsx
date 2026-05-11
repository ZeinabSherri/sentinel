import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}

export function StatCard({ title, value, sub, valueClass }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("font-mono text-3xl font-bold text-zinc-100", valueClass)}>
          {value}
        </div>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
