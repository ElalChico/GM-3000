import React from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

interface RiveBackgroundProps {
  src: string;
  stateMachineName?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const RiveBackground: React.FC<RiveBackgroundProps> = ({ 
  src, 
  stateMachineName = 'State Machine 1',
  className,
  style 
}) => {
  const { RiveComponent, rive } = useRive({
    src,
    stateMachines: stateMachineName,
    autoplay: true,
  });

  return (
    <div className={className} style={style}>
      <RiveComponent className="w-full h-full object-cover" />
    </div>
  );
};
