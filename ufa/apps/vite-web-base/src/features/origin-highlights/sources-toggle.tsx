import { useOriginHighlights } from "./origin-highlights-context";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";

export function SourcesToggle() {
  const {
    showSources,
    toggleShowSources,
  } = useOriginHighlights();

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="show-sources"
        checked={showSources}
        onCheckedChange={toggleShowSources}
      />
      <Label htmlFor="show-sources" className="text-sm font-medium">
        Show sources
      </Label>
    </div>
  );
}
