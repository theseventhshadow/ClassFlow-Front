import React from 'react';

declare global {
  namespace React {
    interface CSSProperties {
      [key: string]: unknown;
    }
  }
}

export {};
