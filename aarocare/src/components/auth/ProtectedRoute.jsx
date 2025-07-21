import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ChangePassword from './ChangePassword';

const ProtectedRoute = ({ redirectPath = '/login' }) => {
  const { isAuthenticated, loading, user, updateUserData } = useAuth();

  // Show nothing while checking authentication status
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  if (user && user.password_change_required) {
    return (
      <ChangePassword 
        user={user}
        onPasswordChanged={(updatedUser) => {
          if (updatedUser) {
            updateUserData(updatedUser);
          } else {
            updateUserData({password_change_required: false });
          }
        }}
      />
    );
  }

  // Render children if authenticated
  return <Outlet />;
};

export default ProtectedRoute;