import { BetaAnalyticsDataClient, type protos, v1alpha } from '@google-analytics/data';
import type { ReportData } from '../types/common.js';
import type {
  BatchRunPivotReportsRequest,
  BatchRunReportsRequest,
  RunCohortReportParams,
  RunFunnelReportParams,
  RunPivotReportParams,
  RunRealtimeReportParams,
  RunReportParams,
} from '../types/data-api.js';
import { withRetry } from '../utils/retry.js';
import { getAuthClientOptions } from './auth.service.js';

// Path aliases — protos namespace is deeply nested; alias for readability at use sites.
type IRunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
type IRunPivotReportRequest = protos.google.analytics.data.v1beta.IRunPivotReportRequest;
type IRunPivotReportResponse = protos.google.analytics.data.v1beta.IRunPivotReportResponse;
type IRunRealtimeReportRequest = protos.google.analytics.data.v1beta.IRunRealtimeReportRequest;
type IRunRealtimeReportResponse = protos.google.analytics.data.v1beta.IRunRealtimeReportResponse;
type IBatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;
type IBatchRunPivotReportsResponse = protos.google.analytics.data.v1beta.IBatchRunPivotReportsResponse;
type ICheckCompatibilityResponse = protos.google.analytics.data.v1beta.ICheckCompatibilityResponse;
type IMetadata = protos.google.analytics.data.v1beta.IMetadata;
export type IAudienceExport = protos.google.analytics.data.v1beta.IAudienceExport;
export type IRecurringAudienceList = protos.google.analytics.data.v1alpha.IRecurringAudienceList;
type IRunFunnelReportRequest = protos.google.analytics.data.v1alpha.IRunFunnelReportRequest;
type IRunFunnelReportResponse = protos.google.analytics.data.v1alpha.IRunFunnelReportResponse;

type ReportLike = {
  dimensionHeaders?: { name?: string | null }[] | null;
  metricHeaders?: { name?: string | null }[] | null;
  rows?:
    | {
        dimensionValues?: { value?: string | null }[] | null;
        metricValues?: { value?: string | null }[] | null;
      }[]
    | null;
  rowCount?: number | null;
  metadata?: unknown;
};

// SDK ClientOptions narrowed in @google-analytics/data 5.x: `auth` is now typed as
// GoogleAuth<AuthClient>, not GoogleAuth<JSONClient>, and OAuth2Client is excluded
// from the JSONClient union. At runtime the SDK accepts both shapes — this is a
// well-known upstream type-narrowness gap. Cast through unknown at the boundary.
type ClientCtor = ConstructorParameters<typeof BetaAnalyticsDataClient>[0];
type AlphaClientCtor = ConstructorParameters<typeof v1alpha.AlphaAnalyticsDataClient>[0];

let betaClient: BetaAnalyticsDataClient | null = null;
let alphaClient: v1alpha.AlphaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (!betaClient) {
    betaClient = new BetaAnalyticsDataClient(getAuthClientOptions() as unknown as ClientCtor);
  }
  return betaClient;
}

function getAlphaClient(): v1alpha.AlphaAnalyticsDataClient {
  if (!alphaClient) {
    alphaClient = new v1alpha.AlphaAnalyticsDataClient(getAuthClientOptions() as unknown as AlphaClientCtor);
  }
  return alphaClient;
}

export function toReportData(response: ReportLike): ReportData {
  const dimensionHeaders = (response.dimensionHeaders ?? []).map((h) => h.name ?? '');
  const metricHeaders = (response.metricHeaders ?? []).map((h) => h.name ?? '');
  const headers = [...dimensionHeaders, ...metricHeaders];

  const rows = (response.rows ?? []).map((row) => {
    const dimValues = (row.dimensionValues ?? []).map((v) => v.value ?? '');
    const metValues = (row.metricValues ?? []).map((v) => v.value ?? '');
    return [...dimValues, ...metValues];
  });

  return {
    headers,
    rows,
    rowCount: Number(response.rowCount ?? rows.length),
    metadata:
      response.metadata && typeof response.metadata === 'object'
        ? { ...(response.metadata as Record<string, unknown>) }
        : undefined,
  };
}

// Local CLI-side option types are intentionally loose (e.g. orderType: string).
// Cast at the SDK boundary — single line per call, isolates drift to one site.

export async function runReport(params: RunReportParams): Promise<ReportData> {
  const [response] = await withRetry(() => getClient().runReport(params as IRunReportRequest), {
    label: 'runReport',
  });
  return toReportData(response as IRunReportResponse);
}

export async function batchRunReports(
  propertyId: string,
  req: BatchRunReportsRequest,
): Promise<ReportData[]> {
  const [response] = await withRetry(
    () =>
      getClient().batchRunReports({
        property: `properties/${propertyId}`,
        requests: req.requests as IRunReportRequest[],
      }),
    { label: 'batchRunReports' },
  );
  const reports = (response as IBatchRunReportsResponse).reports ?? [];
  return reports.map((r) => toReportData(r as ReportLike));
}

export async function runPivotReport(params: RunPivotReportParams): Promise<ReportData> {
  const [response] = await withRetry(() => getClient().runPivotReport(params as IRunPivotReportRequest), {
    label: 'runPivotReport',
  });
  return toReportData(response as IRunPivotReportResponse);
}

export async function batchRunPivotReports(
  propertyId: string,
  req: BatchRunPivotReportsRequest,
): Promise<ReportData[]> {
  const [response] = await withRetry(
    () =>
      getClient().batchRunPivotReports({
        property: `properties/${propertyId}`,
        requests: req.requests as IRunPivotReportRequest[],
      }),
    { label: 'batchRunPivotReports' },
  );
  const pivotReports = (response as IBatchRunPivotReportsResponse).pivotReports ?? [];
  return pivotReports.map((r) => toReportData(r as ReportLike));
}

export async function runRealtimeReport(params: RunRealtimeReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    () => getClient().runRealtimeReport(params as IRunRealtimeReportRequest),
    { label: 'runRealtimeReport' },
  );
  return toReportData(response as IRunRealtimeReportResponse);
}

export async function runFunnelReport(params: RunFunnelReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    () => getAlphaClient().runFunnelReport(params as IRunFunnelReportRequest),
    { label: 'runFunnelReport' },
  );
  const funnelTable = (response as IRunFunnelReportResponse).funnelTable;
  if (!funnelTable) {
    return { headers: [], rows: [], rowCount: 0 };
  }
  return toReportData(funnelTable as ReportLike);
}

export async function runCohortReport(params: RunCohortReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    () =>
      getClient().runReport({
        property: params.property,
        cohortSpec: params.cohortSpec,
        metrics: params.metrics,
        dimensions: params.dimensions,
      } as IRunReportRequest),
    { label: 'runCohortReport' },
  );
  return toReportData(response as IRunReportResponse);
}

export async function getMetadata(propertyId: string): Promise<IMetadata> {
  const [response] = await withRetry(
    () => getClient().getMetadata({ name: `properties/${propertyId}/metadata` }),
    { label: 'getMetadata' },
  );
  return response as IMetadata;
}

export async function checkCompatibility(
  propertyId: string,
  metrics: string[],
  dimensions: string[],
): Promise<ICheckCompatibilityResponse> {
  const [response] = await withRetry(
    () =>
      getClient().checkCompatibility({
        property: `properties/${propertyId}`,
        metrics: metrics.map((name) => ({ name })),
        dimensions: dimensions.map((name) => ({ name })),
      }),
    { label: 'checkCompatibility' },
  );
  return response as ICheckCompatibilityResponse;
}

export interface AudienceExportOperation {
  name?: string | null;
  done?: boolean | null;
  metadata?: protos.google.analytics.data.v1beta.IAudienceExportMetadata | null;
  // The SDK's Operation also exposes promise(), getOperation(), etc. — we keep them via the cast.
  promise?: () => Promise<[IAudienceExport, unknown, unknown]>;
}

export async function createAudienceExport(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<AudienceExportOperation> {
  const [operation] = await getClient().createAudienceExport({
    parent: `properties/${propertyId}`,
    audienceExport: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  });
  return operation as unknown as AudienceExportOperation;
}

export async function getAudienceExport(name: string): Promise<IAudienceExport> {
  const [response] = await getClient().getAudienceExport({ name });
  return response as IAudienceExport;
}

export async function listAudienceExports(propertyId: string): Promise<IAudienceExport[]> {
  const [response] = await getClient().listAudienceExports({
    parent: `properties/${propertyId}`,
  });
  return response ?? [];
}

export async function queryAudienceExport(
  name: string,
  limit?: number,
  offset?: number,
): Promise<ReportData> {
  const [response] = await getClient().queryAudienceExport({
    name,
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
  });
  return toReportData(response as ReportLike);
}

export async function createRecurringAudienceList(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<IRecurringAudienceList> {
  const [response] = await getAlphaClient().createRecurringAudienceList({
    parent: `properties/${propertyId}`,
    recurringAudienceList: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  });
  return response as IRecurringAudienceList;
}

export async function getRecurringAudienceList(name: string): Promise<IRecurringAudienceList> {
  const [response] = await getAlphaClient().getRecurringAudienceList({ name });
  return response as IRecurringAudienceList;
}

export async function listRecurringAudienceLists(propertyId: string): Promise<IRecurringAudienceList[]> {
  const [response] = await getAlphaClient().listRecurringAudienceLists({
    parent: `properties/${propertyId}`,
  });
  return response ?? [];
}
