import { useEffect, useState } from 'react';
import { useCourses } from '../contexts/CourseContext';
import type { CourseData } from '../types/course.types';
import { Course } from './Course';
import { useLocation } from 'react-router-dom';

export const GameContainer = () => {
  const { courses, getThumbnailSecureUrl } = useCourses();
  const [coursesWithThumbnails, setCoursesWithThumbnails] = useState<
    CourseData[]
  >([]);
  const [openedCourse, setOpenedCourse] = useState<CourseData | null>(null);
  const location = useLocation();

  

  const handleCourseClick = (course: CourseData) => {
    console.log(course);
    setOpenedCourse(course);
  };

  useEffect(() => {
    setOpenedCourse(null);
    const fetchThumbnails = async () => {
      const coursesWithThumbnailPromises = courses.map(async (course) => {
        const fetchedUrl = await getThumbnailSecureUrl(course._id);
        return {
          ...course,
          thumbnail: fetchedUrl || '/assets/images/thumbnail-default.png',
        };
      });

      const fetchedCourses = await Promise.all(coursesWithThumbnailPromises);
      setCoursesWithThumbnails(fetchedCourses);
    };

    if (courses.length > 0) {
      fetchThumbnails();
    } else {
      setCoursesWithThumbnails([]);
    }
  }, [courses, getThumbnailSecureUrl]);

  // Auto-open course if `courseId` query param is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseIdParam = params.get('courseId');
    if (courseIdParam && coursesWithThumbnails.length > 0) {
      const target = coursesWithThumbnails.find((c) => c._id === courseIdParam);
      if (target) setOpenedCourse(target);
    }
  }, [location.search, coursesWithThumbnails]);

  return (
    <div
      className="game-container relative w-full h-full bg-center"
    >
      
      <div className="absolute inset-0 flex justify-center items-center gap-4 p-4">
        {openedCourse ? (
          <Course {...openedCourse} onBack={() => setOpenedCourse(null)} />
        ) : (
          coursesWithThumbnails &&
          coursesWithThumbnails.map((course) => (
            <img
              key={course._id}
              src={course.thumbnail}
              className="w-64 h-48 object-cover rounded-xl cursor-pointer transition duration-300 hover:ring-8 hover:ring-[#827a7a71] hover:scale-110"
              alt={`Course thumbnail for ${course.title}`}
              onClick={() => handleCourseClick(course)}
            />
            
          ))
        )} 
        
      </div>
      
    </div>
  );
};
