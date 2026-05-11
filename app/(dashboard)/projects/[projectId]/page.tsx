import { ProjectDetailClient } from "@/components/projects/project-detail-client";

export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  return <ProjectDetailClient projectId={params.projectId} />;
}
