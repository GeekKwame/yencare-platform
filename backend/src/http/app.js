import cors from 'cors';
import express from 'express';
import { createPatientsRouter } from './patientsRoutes.js';
import appointmentRoutes from '../routes/appointmentsRoutes.js';

/**
 * @param {{ patientService: ReturnType<import('../patients/service.js').createPatientService> }} deps
 */
export function createApp({ patientService }) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'yencare-api' });
  });

  app.use('/api/patients', createPatientsRouter(patientService));
  app.use('/api/appointments', appointmentRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, _req, res, _next) => {
    if (err && err.status) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }

    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.error('[api]', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
