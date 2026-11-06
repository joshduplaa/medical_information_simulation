import { useState } from "react";
import { Box, Button, Collapse, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LjSeries } from "../api";
import { evaluateSeries, formatZ, type QcStatus } from "../qc/westgard";
import { formatValue } from "./format";

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
import { QcStatusChip } from "./StatusChip";

const STATUS_COLOR: Record<QcStatus, string> = { ok: "#0F6FA8", warning: "#C77700", reject: "#C62828" };
const LINE = { mean: "#267A3F", sd1: "#9AA9B8", sd2: "#C77700", sd3: "#C62828" };
// Label text needs 4.5:1 on white, so labels use darker shades of the (lighter) line colors.
const LABEL = { mean: "#267A3F", sd1: "#5F6F7F", sd2: "#B45309", sd3: "#C62828" };

interface ChartPoint {
  index: number;
  label: string;
  value: number;
  z: number;
  status: QcStatus;
  rules: string[];
  current: boolean;
}

/**
 * Levey-Jennings chart for one analyte: results in run order against the lot's mean and ±1/2/3 SD limits,
 * with each point colored by its Westgard evaluation. The table under the chart carries the same information
 * for screen-reader and keyboard users (and is what prints).
 */
export default function LeveyJenningsChart({ series, currentReportId }: { series: LjSeries; currentReportId?: string }) {
  const { analyte, points } = series;
  const { mean, stdDevi: sd } = analyte;
  const evaluated = evaluateSeries(points.map((p) => p.value), mean, sd);
  const data: ChartPoint[] = points.map((p, i) => ({
    index: i + 1,
    label: shortDate.format(new Date(p.runDate)),
    value: p.value,
    z: evaluated[i].z,
    status: evaluated[i].status,
    rules: evaluated[i].rules,
    current: p.reportID === currentReportId,
  }));

  const maxAbsZ = Math.max(4, ...data.map((d) => Math.abs(d.z) + 0.5));
  const domain: [number, number] = [mean - maxAbsZ * sd, mean + maxAbsZ * sd];
  const titleId = `lj-${analyte.analyteID}`;
  const current = data.find((d) => d.current) ?? data.at(-1);
  const [showTable, setShowTable] = useState(false);

  return (
    <Paper sx={{ p: 2, breakInside: "avoid" }} component="section" aria-labelledby={titleId}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ mb: 1 }}>
        <Box>
          <Typography id={titleId} variant="h3" component="h3">
            {analyte.analyteName} ({analyte.analyteAcronym})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mean {formatValue(mean, sd)} {analyte.unitOfMeasure} · SD {sd} · {data.length} run{data.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        {current && <QcStatusChip status={current.status} rules={current.rules} />}
      </Stack>

      {data.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No results recorded for this analyte yet.</Typography>
      ) : (
        <>
          <Box sx={{ width: "100%", height: 260 }} aria-hidden>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6ECF2" />
                <XAxis dataKey="index" tickFormatter={(i: number) => data[i - 1]?.label ?? ""} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={domain} tick={{ fontSize: 11 }} width={56} tickFormatter={(v: number) => formatValue(v, sd)} />
                <ReferenceLine y={mean} stroke={LINE.mean} strokeWidth={1.5} label={{ value: "x̄", position: "right", fontSize: 12, fill: LABEL.mean }} />
                {[1, 2, 3].map((k) => {
                  const color = k === 1 ? LINE.sd1 : k === 2 ? LINE.sd2 : LINE.sd3;
                  const labelColor = k === 1 ? LABEL.sd1 : k === 2 ? LABEL.sd2 : LABEL.sd3;
                  return [
                    <ReferenceLine key={`+${k}`} y={mean + k * sd} stroke={color} strokeDasharray="4 4" label={{ value: `+${k}SD`, position: "right", fontSize: 11, fill: labelColor }} />,
                    <ReferenceLine key={`-${k}`} y={mean - k * sd} stroke={color} strokeDasharray="4 4" label={{ value: `−${k}SD`, position: "right", fontSize: 11, fill: labelColor }} />,
                  ];
                })}
                <Tooltip
                  formatter={(value: number, _name, item) => [`${formatValue(value, sd)} ${analyte.unitOfMeasure} (${formatZ((item.payload as ChartPoint).z)})`, analyte.analyteAcronym]}
                  labelFormatter={(i: number) => `Run ${i} · ${data[i - 1]?.label ?? ""}`}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke="#7D93A8"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) => {
                    const p = props.payload!;
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={p.current ? 7 : 4.5}
                        fill={STATUS_COLOR[p.status]}
                        stroke={p.current ? "#1B2733" : "#fff"}
                        strokeWidth={p.current ? 2 : 1}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Button size="small" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="no-print" sx={{ mt: 1 }}>
            {showTable ? "Hide data table" : "Show data table"}
          </Button>
          {/* The table stays mounted (collapsed) so screen readers and print always have the full data. */}
          <Collapse in={showTable} className="lj-table">
          <Box sx={{ overflowX: "auto", mt: 1 }}>
            <Table size="small" aria-label={`${analyte.analyteName} results by run`}>
              <TableHead>
                <TableRow>
                  <TableCell>Run</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Result ({analyte.unitOfMeasure})</TableCell>
                  <TableCell align="right">z-score</TableCell>
                  <TableCell>QC evaluation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.index} selected={d.current}>
                    <TableCell>{d.index}{d.current ? " (this run)" : ""}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{d.label}</TableCell>
                    <TableCell align="right">{formatValue(d.value, sd)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatZ(d.z)}</TableCell>
                    <TableCell><QcStatusChip status={d.status} rules={d.rules} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          </Collapse>
        </>
      )}
    </Paper>
  );
}
