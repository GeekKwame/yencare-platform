export { sendSms, normalizeGhanaPhone, toLocalGhanaPhone } from './sms/sendSms.js';
export { connectDb, disconnectDb, registerShutdownHooks } from './db/connection.js';
export { Patient, Room, Clinician, TimeSlot, Appointment } from './models/index.js';
export {
  generateReferenceCode,
  generateUniqueReferenceCode,
  allocateReferenceCode,
} from './utils/referenceCode.js';
