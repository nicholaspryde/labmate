import { Plus, Trash2 } from "lucide-react";
import type { Series } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type SeriesSidebarProps = {
  series: Series[];
  activeSeriesId: string | null;
  draftName: string;
  onDraftNameChange: (name: string) => void;
  onCreateSeries: () => void;
  onSetActiveSeries: (seriesId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
};

export function SeriesSidebar({
  series,
  activeSeriesId,
  draftName,
  onDraftNameChange,
  onCreateSeries,
  onSetActiveSeries,
  onDeleteSeries,
}: SeriesSidebarProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Series</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="New series name"
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
          />
          <Button type="button" onClick={onCreateSeries} size="icon" aria-label="Create series">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {series.length === 0 && <p className="text-sm text-muted-foreground">No series yet.</p>}
          {series.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-md border p-2 ${activeSeriesId === item.id ? "bg-secondary" : ""}`}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() => onSetActiveSeries(item.id)}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="truncate text-sm">{item.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label="Series actions">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDeleteSeries(item.id)}>Delete series</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
