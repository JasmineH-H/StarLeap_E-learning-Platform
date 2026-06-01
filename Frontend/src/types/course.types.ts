export interface Material {
  _id: string;
  filename: string;
  type: string;
  storageType: 's3' | 'local';
  url: string;
  cloudKey?: string;
  courseId: string;
  secureUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ModuleReference {
  materialId: string;
}

export interface ModuleMaterial {
  materialId: string;
  type: 'exercise' | 'homework';
  name: string;
  _id: string;
}

export interface Module {
  _id: string;
  title: string;
  order: number;
  isModuleOpen?: boolean;
  materials: ModuleMaterial[];
  createdAt: string;
  updatedAt: string;
  crystals: number;
}


export interface CourseData {
  _id: string;
  title: string;
  isOpen: boolean;
  thumbnail?: string;
  modules: Module[];
}

export interface EnrollmentCourse {
  _id: string;
  courseData: CourseData
  isOpen: boolean;
  userId:string
}

export interface DocumentItem {
  id: string;
  title: string;
  url: string;
  type: 'homework' | 'exercise';
  materialId?: string;
}

export interface StudentCourseProgress {
  _id: string;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  stars: string;
}

export interface StudentCourseData {
  course: {
    _id: string;
    title: string;
    description: string;
  };
  isOpen: boolean;
  progress: StudentCourseProgress[];
} 