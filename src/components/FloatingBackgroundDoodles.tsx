import React from 'react';
import Image from 'next/image';

const DOODLES = [
  {
    src: '/asset/doodle-1.png',
    alt: 'Pop-Art Doodle 1',
    style: { top: '10%', left: '-5%', transform: 'rotate(-12deg)' },
    animationDelay: '0s',
  },
  {
    src: '/asset/doodle-2.png',
    alt: 'Pop-Art Doodle 2',
    style: { top: '40%', right: '-8%', transform: 'rotate(6deg)' },
    animationDelay: '1s',
  },
  {
    src: '/asset/doodle-3.png',
    alt: 'Pop-Art Doodle 3',
    style: { bottom: '15%', left: '5%', transform: 'rotate(18deg)' },
    animationDelay: '2s',
  },
];

export const FloatingBackgroundDoodles: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
      {DOODLES.map((doodle, index) => (
        <div
          key={index}
          className="absolute animate-[bounce_4s_infinite] opacity-35"
          style={{ ...doodle.style, animationDelay: doodle.animationDelay }}
        >
          <div className="relative w-48 h-48 sm:w-64 sm:h-64">
            <Image
              src={doodle.src}
              alt={doodle.alt}
              fill
              className="object-contain"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
