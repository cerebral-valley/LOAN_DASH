'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'd',
    altKey: true,
    action: () => window.location.href = '/',
    description: 'Go to Dashboard',
  },
  {
    key: 'y',
    altKey: true,
    action: () => window.location.href = '/yearly',
    description: 'Go to Yearly Breakdown',
  },
  {
    key: 'c',
    altKey: true,
    action: () => window.location.href = '/clients',
    description: 'Go to Clients',
  },
  {
    key: 'v',
    altKey: true,
    action: () => window.location.href = '/vyapari',
    description: 'Go to Vyapari',
  },
  {
    key: 'e',
    altKey: true,
    action: () => window.location.href = '/expenses',
    description: 'Go to Expenses',
  },
  {
    key: 's',
    ctrlKey: true,
    action: (e: KeyboardEvent) => {
      e.preventDefault();
      toast.info('Search feature coming soon!');
    },
    description: 'Search (Ctrl+S)',
  },
  {
    key: '?',
    shiftKey: true,
    action: () => {
      const shortcutList = shortcuts
        .map((s) => {
          const keys = [];
          if (s.ctrlKey) keys.push('Ctrl');
          if (s.altKey) keys.push('Alt');
          if (s.shiftKey) keys.push('Shift');
          keys.push(s.key.toUpperCase());
          return `${keys.join('+')} - ${s.description}`;
        })
        .join('\n');
      
      toast.info(`Keyboard Shortcuts:\n${shortcutList}`, {
        duration: 10000,
      });
    },
    description: 'Show keyboard shortcuts',
  },
];

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey;
        
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          shortcut.action(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}
