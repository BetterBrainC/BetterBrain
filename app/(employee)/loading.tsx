import { SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

export default function EmployeeLoading() {
  return (
    <div className="space-y-4 px-[var(--gutter-page)] pt-4">
      <SkeletonHeader />
      <SkeletonList count={3} />
    </div>
  );
}
