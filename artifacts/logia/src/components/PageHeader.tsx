import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string | ReactNode;
  description?: string | ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-3xl md:text-4xl text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-3 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
