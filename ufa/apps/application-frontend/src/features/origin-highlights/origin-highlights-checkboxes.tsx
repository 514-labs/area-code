import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { useOriginHighlights } from "./origin-highlights-context";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ORIGIN_HIGHLIGHT_COLORS } from "./origin-highlights-colors";
import { cn } from "@workspace/ui/lib/utils";

export function OriginHighlightsCheckboxes() {
  const {
    transactionalEnabled,
    analyticalEnabled,
    retrievalEnabled,
    toggleTransactional,
    toggleAnalytical,
    toggleRetrieval,
  } = useOriginHighlights();

  return (
    <Card className="py-3">
      <CardContent className="px-3 flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="transactional"
            checked={transactionalEnabled}
            onCheckedChange={() => toggleTransactional()}
            className={cn(
              ORIGIN_HIGHLIGHT_COLORS.transactional.background,
              ORIGIN_HIGHLIGHT_COLORS.transactional.border,
              ORIGIN_HIGHLIGHT_COLORS.transactional.text
            )}
          />
          <Label
            htmlFor="transactional"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <span>Transactional</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="analytical"
            checked={analyticalEnabled}
            onCheckedChange={() => toggleAnalytical()}
            className={cn(
              ORIGIN_HIGHLIGHT_COLORS.analytical.background,
              ORIGIN_HIGHLIGHT_COLORS.analytical.border,
              ORIGIN_HIGHLIGHT_COLORS.analytical.text
            )}
          />
          <Label
            htmlFor="analytical"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <span>Analytical</span>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="retrieval"
            checked={retrievalEnabled}
            onCheckedChange={() => toggleRetrieval()}
            className={cn(
              ORIGIN_HIGHLIGHT_COLORS.retrieval.background,
              ORIGIN_HIGHLIGHT_COLORS.retrieval.border,
              ORIGIN_HIGHLIGHT_COLORS.retrieval.text
            )}
          />
          <Label
            htmlFor="retrieval"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <span>Retrieval</span>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
