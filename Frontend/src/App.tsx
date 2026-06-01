import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';
import { ProtectedRoute } from './routes';
import { LoginPage, DashboardPage, ProfilePage, ShopPage } from './pages';
import QuizPage from './pages/QuizPage';
import QuizIntro from './pages/QuizIntro';

function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path = "/shop" element={
                <ProtectedRoute>
                  <ShopPage />
                </ProtectedRoute>
              } />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/quiz-intro/:courseId/:moduleId"
                element={
                  <ProtectedRoute>
                    <QuizIntro />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/earn-stars/:courseId/:moduleId"
                element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </CourseProvider>
    </AuthProvider>
  );
}

export default App;
