import authService from '../services/authService.js';
import {getCookieOptions, getClearCookieOptions} from '../utils/tokenUtils.js'
class AuthController {
  // POST /api/auth/signup
  async signup(req, res) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        message: 'User created successfully',
        ...result
      });
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.message.includes('User already exists')) {
        return res.status(409).json({ error: error.message });
      }

      
      if (error.message.includes('required') || error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }
      
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({ error: 'User already exists with this userName' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { userName, password } = req.body;

      if (!userName || !password) {
        return res.status(400).json({ error: 'userName and password are required' });
      }

      const result = await authService.login(userName, password);

      const origin = req.headers.origin;
      let domain;



      res.cookie('accessToken', result.accessToken, getCookieOptions(domain))
      res.cookie('refreshToken', result.refreshToken, getCookieOptions(domain, true));
      
      res.json({
        message: 'Login successful',
        user: result.user
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const result = await authService.logout(refreshToken);

      const origin = req.headers.origin;
      let domain;


      res.clearCookie('accessToken', getClearCookieOptions(domain));
      res.clearCookie('refreshToken', getClearCookieOptions(domain, true));


      res.json(result);
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/refresh-token
  async refreshToken(req, res) {
    try {
      const  refreshToken  = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const result = await authService.refreshAccessToken(refreshToken);
      res.json(result);
    } catch (error) {
      console.error('Refresh token error:', error);
      
      if (error.message.includes('Invalid refresh token') || error.message.includes('User not found')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }



  // GET /api/auth/profile
  async getProfile(req, res) {
    try {
      const user = await authService.getUserProfile(req.user.userId);
      res.json({ user });
    } catch (error) {
      console.error('Profile error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new AuthController(); 