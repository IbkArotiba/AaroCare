//import './debug-imports';
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';

import Layout from '@/components/common/Layout';
import Login from '@/components/auth/Login';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Pages
import Dashboard from '@/pages/Dashboard';
import AdminRegistration from '@/components/auth/AdminRegistration';
import PatientList from '@/components/patients/PatientList';
import PatientDetail from '@/components/patients/PatientDetail';
import VitalsHistory from '@/components/vitals/VitalsHistory';
import NotesList from '@/components/notes/NotesList';
import ProfilePage from '@/pages/ProfilePage';
import PatientForm from '@/components/patients/PatientForm';
import CareTeamList from '@/components/care-team/CareTeamList';
import TreatmentPlan from '@/components/treatment/TreatmentPlan';
import ChangePassword from '@/components/auth/ChangePassword';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 401 (handled by interceptor)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 401) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Enable React Query DevTools in development
if (import.meta.env.DEV) {
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      devtools: ReactQueryDevtools,
    });
  });
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes - Use parent/child route structure compatible with Outlet */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="admin/register" element={<AdminRegistration />} />
                <Route path="patients" element={<PatientList />} />
                <Route path="patients/form" element={<PatientForm />} />
                <Route path="patients/:id/Details" element={<PatientDetail />} />
                <Route path="patients/:id/care-team" element={<CareTeamList />} />
                <Route path="patients/:id/vitals" element={<VitalsHistory />} />
                <Route path="patients/:id/notes" element={<NotesList />} />
                <Route path="patients/:id/treatment" element={<TreatmentPlan />} />
                <Route path="profile" element={<ProfilePage />} />
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
            
            {/* Global Toast notifications */}
            <Toaster
              position="top-right"
              gutter={8}
              containerStyle={{
                top: 20,
                right: 20,
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  style: {
                    background: '#22c55e',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#22c55e',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#ef4444',
                  },
                },
                loading: {
                  style: {
                    background: '#3b82f6',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;