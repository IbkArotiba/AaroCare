export const config = {
    // In development with Vite proxy, we don't need a base URL
    // In production, use the configured API URL or the default
    apiUrl: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000'),
    
    appName: import.meta.env.VITE_APP_NAME || 'Aarọ Care',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    debug: import.meta.env.VITE_DEBUG === 'true',
  };
  
  // Validate required environment variables (made optional for development)
  const requiredEnvVars = ['VITE_API_URL'];
  requiredEnvVars.forEach((envVar) => {
    if (!import.meta.env[envVar] && !config.isDevelopment) {
      console.warn(`⚠️ Missing required environment variable: ${envVar}`);
    }
  });
  
  // Log configuration in development
  if (config.isDevelopment && config.debug) {
    console.log('🏥 Aarọ Care Configuration:', config);
  }
  
  export default config;