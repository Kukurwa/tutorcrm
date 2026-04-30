import { Badge, cn } from '@tutorcrm/ui';

interface Props {
  name: string;
  color?: string | null; // hex из FunnelStage.color — используется только для точки
  className?: string;
}

// Стандартный shadcn-pattern: outline-badge + цветная точка.
// Никаких заливок капсулы — UI-язык остаётся единым.
export function StagePill({ name, color, className }: Props) {
  return (
    <Badge variant="outline" className={cn('font-normal', className)}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={color ? { backgroundColor: color } : undefined}
        aria-hidden="true"
      />
      {name}
    </Badge>
  );
}
