'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export { toast } from 'sonner';

export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group rounded-md border bg-background text-foreground shadow-lg group-[.toaster]:bg-background',
        },
      }}
      {...props}
    />
  );
}

export type { sonnerToast };
