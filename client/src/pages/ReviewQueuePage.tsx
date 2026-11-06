import { api } from "../api";
import { oldestSubmittedFirst } from "../lib/reviewQueue";
import { EmptyState, ErrorState, Loading } from "../components/PageState";
import { useAsync } from "../components/useAsync";
import PageHeader from "./PageHeader";
import { RunsTable } from "./RunsPage";

export default function ReviewQueuePage() {
  const { data, error, loading, reload } = useAsync(async () => oldestSubmittedFirst(await api.listReports({ status: "Submitted" })), []);
  return (
    <>
      <PageHeader title="Review queue" subtitle="Submitted QC runs waiting for a grade, longest-waiting first." />
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="All caught up" message="No submitted runs are waiting for review." />}
      {data && data.length > 0 && <RunsTable runs={data} showStudent />}
    </>
  );
}
