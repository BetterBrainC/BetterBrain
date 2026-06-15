import { SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

export default function StaffLoading() {
  return (
    <div className="space-y-5">
      <SkeletonHeader />
      <SkeletonList count={4} />
    </div>
  );
}
