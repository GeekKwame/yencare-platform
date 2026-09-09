import cors from 'cors';
import express from 'express';
import { createAppointmentsRouter } from './appointmentsRoutes.js';
import { createCatalogRouter } from './catalogRoutes.js';
import { createPatientsRouter } from './patientsRoutes.js';

/**
 * @param {{
 *   patientService: ReturnType<import('../patients/service.js').createPatientService>,
 *   catalog?: {
 *     listRooms: Function,
 *     listClinicians: Function,
 *     listTimeSlots: Function,
 *   },
 *   appointmentService?: {
 *     createAppointment: Function,
 *     findByReference?: Function,
 *     listAppointments?: Function,
 *     updateStatus?: Function,
 *   },
 * }} deps
 */
export function createApp({ patientService, catalog, appointmentService }) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'yencare-api' });
  });

  app.use('/api/patients', createPatientsRouter(patientService));

  if (appointmentService) {
    app.use('/api/appointments', createAppointmentsRouter(appointmentService));
  }

  if (catalog) {
    app.use('/api', createCatalogRouter(catalog));
  }

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

    if (err?.name === 'ValidationError' || err?.name === 'CastError') {
      return res.status(400).json({ error: err.message });
    }

    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.error('[api]', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
