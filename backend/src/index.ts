/**
 * SAGE — Express Application Entry Point
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { router } from './api/routes';
import { authRouter } from './api/authRoutes';
import { advisorRouter } from './api/advisorRoutes';
import { adminStudentRouter, majorRouter } from './api/adminRoutes';
import { adminSisRouter } from './api/adminSisRoutes';
import { advisorSisRouter } from './api/advisorSisRoutes';
import { advisorAnalyticsRouter } from './api/advisorAnalyticsRoutes';
import { courseRouter } from './api/courseRoutes';
import { sessionRouter } from './api/sessionRoutes';
import { chatRouter } from './api/chatRoutes';
import { dnaRouter } from './api/dnaRoutes';
import { studentSisRouter } from './api/studentSisRoutes';
import { sageRouter } from './api/sageRoutes';
import { studentAnalyticsRouter } from './api/studentAnalyticsRoutes';
import { posRouter } from './api/posRoutes';
import { sharedReportRouter } from './api/sharedReportRoutes';
import { notificationRouter } from './api/notificationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Routes ──────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/advisors', advisorRouter);
app.use('/api/admin/students', adminStudentRouter);
app.use('/api/admin/majors', majorRouter);
app.use('/api/admin', adminSisRouter);
app.use('/api/advisor', advisorSisRouter);
app.use('/api/advisor', advisorAnalyticsRouter);
app.use('/api/student', studentSisRouter);
app.use('/api/pos', posRouter);
app.use('/api/courses', courseRouter);
app.use('/api/class-sessions', sessionRouter);
app.use('/api/students/:studentId', studentAnalyticsRouter); // student analytics
app.use('/api', chatRouter);   // /api/students/:id/chat
app.use('/api', dnaRouter);    // /api/students/:id/dna
app.use('/api', sharedReportRouter);  // /api/student/shared-report, /api/shared-reports/:id/...
app.use('/api', notificationRouter);  // /api/advisor/notifications
app.use('/api', sageRouter);   // /api/sage/chat
app.use('/api', router);       // existing routes (students, majors, AI)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SAGE API', version: '2.0.0' });
});

// ── Start ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SAGE API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Auth:         http://localhost:${PORT}/api/auth/login\n`);
});
