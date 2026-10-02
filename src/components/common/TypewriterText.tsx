import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text?: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursorColor?: string;
  loop?: boolean;
  loopDelay?: number;
  deleteSpeed?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text = 'Cloud PRO',
  speed = 90,
  delay = 200,
  className = '',
  cursorColor = 'bg-sky-500',
  loop = true,
  loopDelay = 2500,
  deleteSpeed = 45,
}) => {
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting && currentText === text) {
      if (loop) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, loopDelay);
      }
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      timeout = setTimeout(() => {}, delay);
    } else {
      const nextDelay = isDeleting ? deleteSpeed : speed;
      timeout = setTimeout(() => {
        if (isDeleting) {
          setCurrentText(text.substring(0, currentText.length - 1));
        } else {
          setCurrentText(text.substring(0, currentText.length + 1));
        }
      }, nextDelay);
    }

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, text, speed, deleteSpeed, loopDelay, delay, loop]);

  return (
    <span className={`inline-flex items-center select-none font-bold tracking-tight ${className}`}>
      <span>{currentText}</span>
      <span
        className={`ml-1 inline-block h-[1.15em] w-0.5 animate-pulse rounded-full ${cursorColor} align-middle shadow-[0_0_8px_rgba(14,165,233,0.8)]`}
        aria-hidden="true"
      />
    </span>
  );
};
