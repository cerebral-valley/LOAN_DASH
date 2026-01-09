/**
 * Optimized DataTable with dynamic imports for better code splitting
 * Use this for pages with large tables to reduce initial bundle size
 */
'use client';

import dynamic from 'next/dynamic';
import LoadingState from './LoadingState';

// Dynamically import the DataTable to split it into a separate chunk
const DataTable = dynamic(() => import('./DataTable').then(mod => ({ default: mod.DataTable })), {
  loading: () => <LoadingState message="Loading table..." />,
  ssr: false, // Disable SSR for this component to reduce initial bundle
});

export default DataTable;
