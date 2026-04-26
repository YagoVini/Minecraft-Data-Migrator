import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Buffer } from 'buffer';
import * as processModule from 'process';

// Fix for prismarine-nbt/buffer in browser
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  window.global = window.global || window;
  
  if (!window.process) {
    (window as any).process = processModule;
  }

  const proc = window.process as any;
  
  if (!proc.nextTick) {
    try {
      proc.nextTick = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
    } catch (e) {
      // If read-only, try to redefine or use a proxy/wrapper if needed
      // But usually this happens if it's already defined as a non-writable prop
      console.warn('process.nextTick is read-only or could not be assigned');
    }
  }
  
  if (!window.setImmediate) {
    (window as any).setImmediate = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
  }

  if (!proc.env) {
    proc.env = {};
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
