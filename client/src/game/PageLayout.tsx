import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface PageLayoutProps {
  readonly title: string;
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
}

export function PageLayout({ title, trailing, children }: PageLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} trailing={trailing} />
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="mx-auto w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
