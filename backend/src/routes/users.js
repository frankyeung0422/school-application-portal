const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const SchoolMonitor = require('../models/schoolMonitor.model');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone, email },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update notification preferences
router.patch('/:userId/notification-preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, push, frequency } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        'notificationPreferences.email': email,
        'notificationPreferences.push': push,
        'notificationPreferences.frequency': frequency
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Add school to interested schools
router.post('/:userId/interested-schools', async (req, res) => {
  try {
    const { userId } = req.params;
    const { schoolNo, schoolName } = req.body;
    
    // Check if school exists in monitoring system
    const schoolMonitor = await SchoolMonitor.findOne({ schoolNo });
    if (!schoolMonitor) {
      return res.status(404).json({ error: 'School not found in monitoring system' });
    }

    // Check if already interested
    const existingUser = await User.findOne({
      _id: userId,
      'interestedSchools.schoolNo': schoolNo
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Already interested in this school' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          interestedSchools: {
            schoolNo,
            schoolName,
            addedAt: new Date()
          }
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error adding interested school:', error);
    res.status(500).json({ error: 'Failed to add interested school' });
  }
});

// Remove school from interested schools
router.delete('/:userId/interested-schools/:schoolNo', async (req, res) => {
  try {
    const { userId, schoolNo } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          interestedSchools: { schoolNo }
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error removing interested school:', error);
    res.status(500).json({ error: 'Failed to remove interested school' });
  }
});

// Get user's interested schools
router.get('/:userId/interested-schools', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('interestedSchools');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get additional information about each school
    const interestedSchools = await Promise.all(
      user.interestedSchools.map(async (school) => {
        const schoolMonitor = await SchoolMonitor.findOne({ schoolNo: school.schoolNo });
        return {
          ...school.toObject(),
          monitoringInfo: schoolMonitor ? {
            lastChecked: schoolMonitor.lastChecked,
            applicationStatus: schoolMonitor.applicationStatus,
            websiteUrl: schoolMonitor.websiteUrl
          } : null
        };
      })
    );

    res.json(interestedSchools);

  } catch (error) {
    console.error('Error fetching interested schools:', error);
    res.status(500).json({ error: 'Failed to fetch interested schools' });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      verificationToken
    });

    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Hash password for comparison
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    const user = await User.findOne({ email, password: hashedPassword });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);

  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Change password
router.patch('/:userId/change-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const currentHashedPassword = crypto.createHash('sha256').update(currentPassword).digest('hex');
    if (user.password !== currentHashedPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newHashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    user.password = newHashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send reset email (implementation would go here)
    // await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If an account with this email exists, a reset link has been sent.' });

  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router; 