import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { useServiceHighlight } from "../contexts/service-highlight-context";
import { Card, CardContent } from "@workspace/ui/components/card";

export function SidebarServiceHighlight() {
  const {
    transactionalEnabled,
    analyticalEnabled,
    toggleTransactional,
    toggleAnalytical,
  } = useServiceHighlight();

  return (
    <Card className="py-3">
      <CardContent className="px-3 flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="transactional"
            checked={transactionalEnabled}
            onCheckedChange={() => toggleTransactional()}
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
          />
          <Label
            htmlFor="analytical"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <span>Analytical</span>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
