import express, { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';

const router: Router = express.Router();

// Protect all routes
router.use(authMiddleware);

// Middleware to check if user is admin
const adminOnly = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

// GET /api/users - Get all users (admin only)
router.get('/', adminOnly, async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        userName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', adminOnly, async (req: AuthRequest, res) => {
  try {
    const { email, password, userName, role } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        userName: userName || null,
        role: role || 'USER',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', adminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, userName, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        email: email || existingUser.email,
        userName: userName !== undefined ? userName : existingUser.userName,
        role: role || existingUser.role,
        isActive: isActive !== undefined ? isActive : existingUser.isActive,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', adminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    // Prevent admin from deleting themselves
    if (id === currentUserId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;