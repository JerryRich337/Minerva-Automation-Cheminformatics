import { ProjectSection } from "@/components/project-section";

import { SubscriberOverview } from "./_components/subscriber-overview";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* We replaced <MetricCards /> with your custom section! */}
      <ProjectSection />
      {/* <PerformanceOverview /> */}
      <SubscriberOverview />
    </div>
  );
}
