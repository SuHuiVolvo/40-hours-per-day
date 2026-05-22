type DropIndicatorProps = {
  className: string;
};

export function DropIndicator({ className }: DropIndicatorProps) {
  return <div className={className} aria-hidden="true" />;
}
