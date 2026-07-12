import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yres/ui";
import { Layers, Pencil } from "lucide-react";
import { useState } from "react";
import { useEnvelope } from "../../hooks";
import { ApiError } from "../../lib/api";
import {
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
  ORIENTATION_LABELS,
  formatNumber,
} from "../../lib/labels";
import { EnvelopeEditorDialog } from "./envelope-editor-dialog";

export function EnvelopeTab({ buildingId }: { buildingId: string }) {
  const { data, isLoading, isError, error } = useEnvelope(buildingId);
  const [editorOpen, setEditorOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load envelope data:{" "}
          {error instanceof ApiError ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const isEmpty =
    data.constructionTypes.length === 0 &&
    data.openingTypes.length === 0 &&
    data.envelopeElements.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Construction assemblies, opening types, and the elements that reference them. The editor
          manages the "before" (baseline) scenario.
        </p>
        <Button size="sm" onClick={() => setEditorOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit envelope
        </Button>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Layers className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No envelope data yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Define construction types, opening types, and envelope elements to enable heat-loss
              calculations for this building.
            </p>
            <Button className="mt-2" onClick={() => setEditorOpen(true)}>
              <Pencil className="h-4 w-4" />
              Add envelope data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Construction types</CardTitle>
            </CardHeader>
            <CardContent>
              {data.constructionTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">None defined.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Layers</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.constructionTypes.map((ct) => (
                      <TableRow key={ct.id}>
                        <TableCell className="font-medium">{ct.code}</TableCell>
                        <TableCell>
                          {ENVELOPE_ELEMENT_CATEGORY_LABELS[
                            ct.elementCategory as keyof typeof ENVELOPE_ELEMENT_CATEGORY_LABELS
                          ] ?? ct.elementCategory}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ct.scenario === "before" ? "secondary" : "default"}>
                            {ct.scenario}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ct.layers.length} layer{ct.layers.length === 1 ? "" : "s"} (
                          {formatNumber(
                            ct.layers.reduce((sum, l) => sum + l.thicknessM, 0) * 100,
                            1,
                          )}{" "}
                          cm)
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ct.description ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opening types</CardTitle>
            </CardHeader>
            <CardContent>
              {data.openingTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">None defined.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Scenario</TableHead>
                      <TableHead>U-value (W/m²K)</TableHead>
                      <TableHead>Size (m)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.openingTypes.map((ot) => (
                      <TableRow key={ot.id}>
                        <TableCell className="font-medium">{ot.code}</TableCell>
                        <TableCell className="capitalize">{ot.category}</TableCell>
                        <TableCell>
                          <Badge variant={ot.scenario === "before" ? "secondary" : "default"}>
                            {ot.scenario}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNumber(ot.uValueWm2k, 2)}</TableCell>
                        <TableCell>
                          {ot.widthM && ot.heightM
                            ? `${formatNumber(ot.widthM)} × ${formatNumber(ot.heightM)}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Envelope elements</CardTitle>
            </CardHeader>
            <CardContent>
              {data.envelopeElements.length === 0 ? (
                <p className="text-sm text-muted-foreground">None defined.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Block</TableHead>
                      <TableHead>Orientation</TableHead>
                      <TableHead>Construction</TableHead>
                      <TableHead>Length (m)</TableHead>
                      <TableHead>Openings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.envelopeElements.map((el) => (
                      <TableRow key={el.id}>
                        <TableCell className="font-medium">{el.blockName}</TableCell>
                        <TableCell>{ORIENTATION_LABELS[el.orientation]}</TableCell>
                        <TableCell>{el.constructionType?.code ?? "—"}</TableCell>
                        <TableCell>{formatNumber(el.lengthM)}</TableCell>
                        <TableCell>
                          {el.openings.length === 0
                            ? "—"
                            : el.openings
                                .map((o) => `${o.openingType?.code ?? "?"} ×${o.count}`)
                                .join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <EnvelopeEditorDialog
        buildingId={buildingId}
        envelope={data}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
