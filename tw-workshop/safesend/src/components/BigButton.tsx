import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  hint?: string;
};

export function BigButton({ children, hint, className = '', ...rest }: Props) {
  return (
    <button {...rest} className={`btn-huge ${className}`}>
      <span className="flex flex-col items-center">
        <span>{children}</span>
        {hint ? <span className="text-base font-normal opacity-90">{hint}</span> : null}
      </span>
    </button>
  );
}
