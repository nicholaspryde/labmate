import { TimepointCalendarApp } from "@/components/timepoint-calendar-app";

type SeriesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ timepoint?: string }>;
};

export default async function SeriesPage({ params, searchParams }: SeriesPageProps) {
  const { id } = await params;
  const { timepoint } = await searchParams;

  return (
    <TimepointCalendarApp
      deepLinkSeriesId={id}
      deepLinkTimepointId={timepoint ?? null}
    />
  );
}
