declare module 'lucide-react/dist/esm/icons/*' {
  import type {
    ForwardRefExoticComponent,
    RefAttributes,
    SVGProps,
  } from 'react';

  type LucideDirectIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
    absoluteStrokeWidth?: boolean;
    size?: number | string;
  };

  const icon: ForwardRefExoticComponent<
    LucideDirectIconProps & RefAttributes<SVGSVGElement>
  >;

  export default icon;
}
