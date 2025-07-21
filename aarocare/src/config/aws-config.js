// src/config/aws-config.js
import { Amplify } from 'aws-amplify';
import { config } from './env';

// Get Cognito config from environment variables
const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolWebClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

// Configure Amplify
const awsConfig = {
  Auth: {
    region,
    userPoolId,
    userPoolWebClientId,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    oauth: {
      domain: import.meta.env.VITE_COGNITO_DOMAIN,
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: `${window.location.origin}/`,
      redirectSignOut: `${window.location.origin}/login`,
      responseType: 'code'
    }
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: config.apiUrl,
        region
      }
    ]
  }
};

// Initialize Amplify with configuration
export const initializeAWS = () => {
  Amplify.configure(awsConfig);
};

export default awsConfig;
