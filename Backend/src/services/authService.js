import { RefreshToken } from '../models/Token.js';
import userService from './userService.js';

import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/tokenUtils.js';

class AuthService {
  // Register new user with tokens
  async register(userData) {
    const validationErrors = userService.validateUserData(userData);
    if (validationErrors.length) throw new Error(validationErrors.join(', '));

    let user;
    let generatedPassword


    if (userData.role === 'student') {
      ({user, generatedPassword} = await userService.createStudent(userData));
    } else {
      ({user, generatedPassword} = await userService.createStaff(userData));
    }



    return { user: user.toSafeObject(), generatedPassword };
    
  }


  // Login user
  async login(userName, password) {
    // Authenticate user
    const user = await userService.authenticateUser(userName, password);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();

    // Save refresh token
    const refreshToken = new RefreshToken({
      token: refreshTokenValue,
      userId: user._id
    });
    console.log('Saving refresh token:', refreshToken);
    await refreshToken.save();

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken: refreshTokenValue
    };
  }

  // Logout user
  async logout(refreshTokenValue) {
    if (refreshTokenValue) {
      await RefreshToken.findOneAndDelete({ token: refreshTokenValue });
    }
    return { message: 'Logout successful' };
  }

  // Refresh access token
  async refreshAccessToken(refreshTokenValue) {
    // Find and verify refresh token
    const storedToken = await RefreshToken.findOne({ token: refreshTokenValue }).populate('userId');
    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }
    const user = storedToken.userId;
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshTokenValue = generateRefreshToken();

    // Remove old refresh token and create new one
    await RefreshToken.findByIdAndDelete(storedToken._id);
    const newRefreshToken = new RefreshToken({
      token: newRefreshTokenValue,
      userId: user._id
    });
    await newRefreshToken.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenValue
    };
  }



  // Get user profile
  async getUserProfile(userId) {
    return await userService.getUserProfile(userId);
  }

  // Clean up expired tokens (utility method)
  async cleanupExpiredTokens() {
    await Promise.all([
      RefreshToken.cleanupExpired(),
    ]);
  }
}

export default new AuthService(); 