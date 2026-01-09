/**
 * Shared utility components for better code splitting
 * These components are extracted to reduce duplication across pages
 */

export { default as LoadingState } from './LoadingState';
export { default as ErrorState } from './ErrorState';

// Re-export common UI components
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
export { Button } from './ui/button';
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
