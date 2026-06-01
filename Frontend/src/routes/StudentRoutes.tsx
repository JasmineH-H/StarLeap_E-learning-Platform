import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

interface StudentRoutesProps {
  children: React.ReactNode;
}

export const StudentRoutes: React.FC<StudentRoutesProps> = ({ children }) => {
  return <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;
};
