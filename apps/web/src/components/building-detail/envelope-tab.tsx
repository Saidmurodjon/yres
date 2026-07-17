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
import { useTranslation } from "react-i18next";
import { useEnvelope } from "../../hooks";
import { ApiError } from "../../lib/api";
import {
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
  ORIENTATION_LABELS,
  formatNumber,
} from "../../lib/labels";
import { EnvelopeEditorDialog } from "./envelope-editor-dialog";

export function EnvelopeTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { t } = useTranslation("envelope");
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
          {t("tab.failedToLoad")}{" "}
          {error instanceof ApiError ? error.message : t("common:unknownError")}
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
        <p className="text-sm text-muted-foreground">{t("tab.description")}</p>
        {!readOnly && (
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t("tab.editEnvelope")}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Layers className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t("tab.emptyTitle")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("tab.emptyDescription")}</p>
            {!readOnly && (
              <Button className="mt-2" onClick={() => setEditorOpen(true)}>
                <Pencil className="h-4 w-4" />
                {t("tab.addEnvelopeData")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tab.constructionTypes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.constructionTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("tab.noneDefined")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tab.columnCode")}</TableHead>
                      <TableHead>{t("tab.columnCategory")}</TableHead>
                      <TableHead>{t("tab.columnScenario")}</TableHead>
                      <TableHead>{t("tab.columnLayers")}</TableHead>
                      <TableHead>{t("tab.columnDescription")}</TableHead>
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
                          {t("tab.layersSummary", {
                            count: ct.layers.length,
                            cm: formatNumber(
                              ct.layers.reduce((sum, l) => sum + l.thicknessM, 0) * 100,
                              1,
                            ),
                          })}
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
              <CardTitle className="text-base">{t("tab.openingTypes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.openingTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("tab.noneDefined")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tab.columnCode")}</TableHead>
                      <TableHead>{t("tab.columnCategory")}</TableHead>
                      <TableHead>{t("tab.columnScenario")}</TableHead>
                      <TableHead>{t("tab.columnUValue")}</TableHead>
                      <TableHead>{t("tab.columnSize")}</TableHead>
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
              <CardTitle className="text-base">{t("tab.envelopeElements")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.envelopeElements.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("tab.noneDefined")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tab.columnBlock")}</TableHead>
                      <TableHead>{t("tab.columnOrientation")}</TableHead>
                      <TableHead>{t("tab.columnConstruction")}</TableHead>
                      <TableHead>{t("tab.columnLength")}</TableHead>
                      <TableHead>{t("tab.columnOpenings")}</TableHead>
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
