import api from "./api";

export const STAFF_TOKEN_KEY = "yencare_staff_token";
export const STAFF_USER_KEY = "yencare_staff_user";
export const DEMO_STAFF_PASSWORD = "yencare";

export const DEMO_STAFF_ACCOUNTS = [
  {
    identifier: "abena.osei@yencare.gh",
    password: DEMO_STAFF_PASSWORD,
    destination: "Queue Desk",
    staff: {
      id: "stf_01",
      staffId: "stf_01",
      name: "Abena Osei",
      email: "abena.osei@yencare.gh",
      role: "RECEPTIONIST",
      assignedRoom: null,
      clinicSite: "students-clinic",
    },
  },
  {
    identifier: "kwame.boateng@yencare.gh",
    password: DEMO_STAFF_PASSWORD,
    destination: "Room 1 Consult",
    staff: {
      id: "stf_02",
      staffId: "stf_02",
      name: "Dr. Kwame Boateng",
      email: "kwame.boateng@yencare.gh",
      role: "DOCTOR",
      assignedRoom: "Room 1",
      clinicSite: "students-clinic",
      clinicianId: "68bf2c0e9c1a2b0012345671",
    },
  },
  {
    identifier: "kojo.mensah@yencare.gh",
    password: DEMO_STAFF_PASSWORD,
    destination: "Operations",
    staff: {
      id: "stf_03",
      staffId: "stf_03",
      name: "Kojo Mensah",
      email: "kojo.mensah@yencare.gh",
      role: "ADMIN",
      assignedRoom: null,
      clinicSite: "students-clinic",
    },
  },
  {
    identifier: "ama.serwaa@yencare.gh",
    password: DEMO_STAFF_PASSWORD,
    destination: "Room 2 Consult",
    staff: {
      id: "stf_04",
      staffId: "stf_04",
      name: "Dr. Ama Serwaa",
      email: "ama.serwaa@yencare.gh",
      role: "DOCTOR",
      assignedRoom: "Room 2",
      clinicSite: "students-clinic",
      clinicianId: "68bf2c0e9c1a2b0012345672",
    },
  },
];

export function persistStaffSession(token, staff) {
  localStorage.setItem(STAFF_TOKEN_KEY, token);
  localStorage.setItem(STAFF_USER_KEY, JSON.stringify(staff));
}

export function clearStaffSession() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(STAFF_USER_KEY);
}

export function readStoredStaffSession() {
  try {
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    const raw = localStorage.getItem(STAFF_USER_KEY);
    if (!token || !raw) return { token: null, staff: null };
    return { token, staff: JSON.parse(raw) };
  } catch {
    return { token: null, staff: null };
  }
}

export async function loginStaff({ identifier, email, password }) {
  const response = await api.post("/auth/staff-login", {
    identifier: identifier || email,
    email,
    password,
  });
  return response.data;
}

export async function fetchCurrentStaff() {
  const response = await api.get("/auth/staff-me");
  return response.data.staff;
}

export async function refreshStaffToken() {
  const response = await api.post("/auth/staff-refresh");
  return response.data;
}

export function localDemoSession(account) {
  return {
    token: `demo-local.${account.staff.role}`,
    staff: account.staff,
  };
}
