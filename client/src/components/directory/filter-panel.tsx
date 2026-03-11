import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DirectoryFilters {
  search: string;
  practiceMode: string;
  acceptingClients: boolean;
  willingToTravel: boolean;
}

interface FilterPanelProps {
  filters: DirectoryFilters;
  onChange: (filters: DirectoryFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="filter-search" className="mb-1.5 block text-sm">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="filter-search"
            type="search"
            placeholder="Search by name, specialty..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="min-w-[160px]">
        <Label htmlFor="filter-session-format" className="mb-1.5 block text-sm">
          Session Format
        </Label>
        <Select
          value={filters.practiceMode}
          onValueChange={(value) => onChange({ ...filters, practiceMode: value })}
        >
          <SelectTrigger id="filter-session-format" data-testid="select-session-format">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent className="z-[1000]">
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="in_person">In-Person</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 pb-1">
        <Checkbox
          id="filter-accepting"
          checked={filters.acceptingClients}
          onCheckedChange={(checked) =>
            onChange({ ...filters, acceptingClients: checked === true })
          }
          data-testid="checkbox-accepting-clients"
        />
        <Label htmlFor="filter-accepting" className="text-sm cursor-pointer">
          Accepting Clients
        </Label>
      </div>

      <div className="flex items-center gap-2 pb-1">
        <Checkbox
          id="filter-willing-travel"
          checked={filters.willingToTravel}
          onCheckedChange={(checked) =>
            onChange({ ...filters, willingToTravel: checked === true })
          }
          data-testid="checkbox-willing-to-travel"
        />
        <Label htmlFor="filter-willing-travel" className="text-sm cursor-pointer">
          Willing to Travel
        </Label>
      </div>
    </div>
  );
}
