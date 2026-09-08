import express from 'express';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Patient, Clinician, TimeSlot } from '../models/index.js';
import { APPOINTMENT_STATUSES, VISIT_TYPES } from '../db/constants.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    patientId,
    clinicianId,
    roomId,
    timeSlotId,
    clinicSite,
    visitType,
    bookingType = 'BOOKED',
  } = req.body;

  if (
    !patientId ||
    !clinicianId ||
    !roomId ||
    !timeSlotId ||
    !clinicSite ||
    !visitType
  ) {
    return res.status(400).json({
      message:
        'patientId, clinicianId, roomId, timeSlotId, clinicSite and visitType are required',
    });
  }

  if (!mongoose.isValidObjectId(patientId) ||
      !mongoose.isValidObjectId(clinicianId) ||
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(timeSlotId)) {
    return res.status(400).json({
      message: 'Invalid ID supplied',
    });
  }

  if (!VISIT_TYPES.includes(visitType)) {
    return res.status(400).json({
      message: 'Invalid visitType',
    });
  }

  const session = await mongoose.startSession();

  try {
    let appointment;

    await session.withTransaction(async () => {
      const patient = await Patient.findById(patientId).session(session);
      if (!patient) {
        throw Object.assign(new Error('Patient not found'), { status: 404 });
      }

      const clinician = await Clinician.findById(clinicianId).session(session);
      if (!clinician) {
        throw Object.assign(new Error('Clinician not found'), { status: 404 });
      }

      const slot = await TimeSlot.findOne({
        _id: timeSlotId,
        clinicianId,
        roomId,
        clinicSite,
      }).session(session);

      if (!slot) {
        throw Object.assign(new Error('Time slot not found'), { status: 404 });
      }

      // Atomic booking lock: only an open slot can be changed to booked.
      const bookedSlot = await TimeSlot.findOneAndUpdate(
        {
          _id: timeSlotId,
          isBooked: false,
          appointmentId: null,
        },
        {
          $set: {
            isBooked: true,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!bookedSlot) {
        throw Object.assign(
          new Error('This appointment slot is already booked'),
          { status: 409 },
        );
      }

      [appointment] = await Appointment.create(
        [
          {
            patientId,
            clinicianId,
            roomId,
            timeSlotId,
            clinicSite,
            visitType,
            bookingType,
            status: APPOINTMENT_STATUSES.includes('BOOKED')
              ? 'BOOKED'
              : undefined,
            appointmentDate: slot.date,
            appointmentTime: slot.startTime,
          },
        ],
        { session },
      );

      await TimeSlot.updateOne(
        { _id: timeSlotId },
        {
          $set: {
            appointmentId: appointment._id,
            isBooked: true,
          },
        },
        { session },
      );
    });

    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error('Appointment booking error:', error);

    return res.status(500).json({
      message: 'Failed to book appointment',
    });
  } finally {
    await session.endSession();
  }
});

export default router;