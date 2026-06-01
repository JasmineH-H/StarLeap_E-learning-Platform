
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export function Headers() {
  const { logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className='bg-gray-50'>
      <div className="max-w-7xl mx-20 px-4 sm:px-6 lg:px-8 ">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-[#fab630]">
              StarLeap
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="border-gray-700 text-gray-700 border-2 hover:bg-gray-700 hover:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="border-[#A93511] border-2 text-[#A93511]  hover:bg-[#A93511] hover:text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
    
  )
}