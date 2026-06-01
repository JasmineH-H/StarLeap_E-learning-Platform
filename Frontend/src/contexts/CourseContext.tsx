import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type {
  CourseData,
  Material,
  EnrollmentCourse,
  DocumentItem,
  Module,
  ModuleMaterial,
} from '../types/course.types';
import { useAuth } from './AuthContext';
import { makeAuthenticatedRequest } from '../utils/api';

interface CourseContextType {
  courses: CourseData[];
  isLoading: boolean;
  error: string | null;
  fetchCourses: () => Promise<void>;
  getMaterialSecureUrl: (materialId: string) => Promise<string | null>;
  getThumbnailSecureUrl: (courseId: string) => Promise<string | null>;
  getDocumentItemsFromCourse: (
    courseId: string,
    moduleOrder?: number
  ) => DocumentItem[];
  clearError: () => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuth();

  // Fetch all courses
  const fetchCourses = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(
        `/api/study/${user._id}/courses`
      );
      const data: { success: boolean; data: EnrollmentCourse[] } =
        await response.json();
        console.log("Fetched courses:", data);
      if (data.success) {
        setCourses(
          data.data.map((course) => ({
            ...course.courseData,
            isOpen: course.isOpen,
          }))
        );
      } else {
        throw new Error('Failed to fetch courses');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch courses';
      setError(errorMessage);
      console.error('Error fetching courses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Get secure URL for a material- get /api/courses/materials/materialId
  const getMaterialSecureUrl = async (
    materialId: string
  ): Promise<string | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await makeAuthenticatedRequest(
        `/api/courses/materials/${materialId}`
      );
      const data: { success: boolean; data: { material: Material } } =
        await response.json();

      if (data.success && data.data.material.secureUrl) {
        return data.data.material.secureUrl;
      } else {
        throw new Error('Failed to get secure URL');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get material URL';
      setError(errorMessage);
      console.error('Error getting material URL:', err);
      return null;
    }
  };

  // Get secure URL for a course thumbnail
  const getThumbnailSecureUrl = async (
    courseId: string
  ): Promise<string | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await makeAuthenticatedRequest(
        `/api/courses/${courseId}/thumbnail`
      );
      const data: {
        success: boolean;
        data: { thumbnail: { secureUrl?: string } };
      } = await response.json();

      if (data.success && data.data.thumbnail.secureUrl) {
        return data.data.thumbnail.secureUrl;
      } else {
        throw new Error('Failed to get thumbnail secure URL');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get thumbnail URL';
      setError(errorMessage);
      console.error('Error getting thumbnail URL:', err);
      return null;
    }
  };

  // Get document items from course structure (works with courses data only)
  const getDocumentItemsFromCourse = (
    courseId: string,
    moduleOrder?: number
  ): DocumentItem[] => {
    const course = courses.find((c) => c._id === courseId);
    if (!course) return [];

    const documents: DocumentItem[] = [];
    console.log("Getting documents for course:", courseId, "moduleOrder:", moduleOrder);
    // If moduleOrder is specified, get documents for that specific module
    if (moduleOrder !== undefined) {
      console.log("what is in course modules:", course.modules);
      const module = course.modules?.find(
        (m: Module) => m.order === moduleOrder
      );
      if (module && module.materials) {
        module.materials.forEach((material: ModuleMaterial) => {
          documents.push({
            id: `${material.type}-${material._id}`,
            title: material.name,
            url: '', // Will be populated with secure URL later
            type: material.type,
            materialId: material.materialId,
          });
        });
      }
    } else {
      // Get all documents for all modules in the course
      course.modules?.forEach((module: Module) => {
        if (module.materials) {
          module.materials.forEach((material: ModuleMaterial) => {
            documents.push({
              id: `${material.type}-${material._id}`,
              title: `${module.title} - ${material.name}`,
              url: '', // Will be populated with secure URL later
              type: material.type,
              materialId: material.materialId,
            });
          });
        }
      });
    }

    return documents;
  };

  // Clear error state
  const clearError = () => {
    setError(null);
  };

  // Fetch courses when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCourses();
    } else {
      // Clear data when not authenticated
      setCourses([]);
      setError(null);
    }
  }, [fetchCourses, isAuthenticated]);

  const value: CourseContextType = {
    courses,
    isLoading,
    error,
    fetchCourses,
    getMaterialSecureUrl,
    getThumbnailSecureUrl,
    getDocumentItemsFromCourse,
    clearError,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
