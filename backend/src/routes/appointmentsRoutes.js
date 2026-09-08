import express from 'express';
import Appointment from '../models/Appointment.js';
import { normalizeGhanaPhone } from '../sms/normalizePhone.js';

const router = express.Router();

/**
 * POST /api/appointments
 *
 * Creates a new appointment.
 * MongoDB's unique index on doctor + startsAt
 * prevents double-booking.
 */
router.post('/', async (req, res) => {
  try {
    const {
      patientName,
      phone,
      doctor,
      date,
      time,
    } = req.body;

    // Basic required-field validation
    if (!patientName || !phone || !doctor || !date || !time) {
      return res.status(400).json({
        message:
          'patientName, phone, doctor, date and time are required',
      });
    }

    // Normalize Ghana phone number to E.164
    let normalizedPhone;

    try {
      normalizedPhone = normalizeGhanaPhone(phone);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    /*
     * Convert the supplied date and time into a JavaScript Date.
     *
     * Example:
     * date = "2026-09-15"
     * time = "10:00"
     */
    const startsAt = new Date(`${date}T${time}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      return res.status(400).json({
        message: 'Invalid appointment date or time',
      });
    }

    // Generate appointment reference
    const reference = `YC-${Math.floor(1000 + Math.random() * 9000)}`;

    const appointment = await Appointment.create({
      reference,
      patientName: patientName.trim(),
      phone: normalizedPhone,
      doctor: doctor.trim(),
      startsAt,
    });

    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    /*
     * MongoDB duplicate-key error.
     *
     * This happens when another patient has already
     * booked the same doctor's slot.
     */
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This appointment slot is already booked',
      });
    }

    console.error('Appointment booking error:', error);

    return res.status(500).json({
      message: 'Failed to book appointment',
    });
  }
});

export default router;
