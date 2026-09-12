import { CommandCenterMark } from "./CommandCenterMark";

export function BrandKicker() {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase">
      <CommandCenterMark className="h-4 w-4" />
      Command Center
    </div>
  );
}
