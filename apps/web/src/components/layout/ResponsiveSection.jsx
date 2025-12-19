import React from 'react';
import { cn } from '../../lib/utils';

const widthClassMap = {
  narrow: 'max-w-4xl',
  default: 'max-w-7xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
};

const ResponsiveSection = ({
  as: Component = 'section',
  children,
  className = '',
  containerClassName = '',
  id,
  padded = true,
  width = 'default',
}) => (
  <Component id={id} className={cn('w-full', className)}>
    <div
      className={cn(
        'mx-auto w-full',
        padded && 'px-4 sm:px-6 lg:px-8',
        widthClassMap[width] ?? widthClassMap.default,
        containerClassName,
      )}
    >
      {children}
    </div>
  </Component>
);

export default ResponsiveSection;
