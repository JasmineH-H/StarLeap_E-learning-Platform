import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

interface InstructorRoutesProps {
  children: React.ReactNode;
}

export const InstructorRoutes: React.FC<InstructorRoutesProps> = ({
  children,
}) => {
  return <ProtectedRoute requiredRole="instructor">{children}</ProtectedRoute>;
};
