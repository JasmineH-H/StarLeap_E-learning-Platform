import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;


const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// JWT Token Generation
export const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      userName: user.userName, 
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
};

// Random Token Generation
export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};


// JWT Verification
export const verifyAccessToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

// JWT Verification with Ignoring Expiration (for refresh)
export const verifyTokenIgnoreExpiration = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
      if (err && err.name !== 'TokenExpiredError') {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}; 

export const getCookieOptions = (frontendDomain, isRefreshToken = false) => {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  if (isRefreshToken) {
    return {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth', // Only send to auth routes
      sameSite: isProduction ? 'none' : 'lax',
      domain: isProduction ? frontendDomain : undefined,
    };
  }

  return {
    ...baseOptions,
    maxAge: 45 * 60 * 1000, // 45 minutes
    path: '/', // Send to all routes
    sameSite: isProduction ? 'none' : 'lax',
  };
};


// Add new function for clearing
export const getClearCookieOptions = (frontendDomain, isRefreshToken = false) => {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  if (isRefreshToken) {
    return {
      ...baseOptions,
      path: '/api/auth',
      sameSite: isProduction ? 'none' : 'lax',
      domain: isProduction ? frontendDomain : undefined,
    };
  }

  return {
    ...baseOptions,
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
  };
};