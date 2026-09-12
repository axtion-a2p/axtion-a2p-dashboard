export function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}
