import knustHospitalPhoto from "../assets/facilities/knust-hospital.jpg";
import studentsClinicPhoto from "../assets/facilities/students-clinic.jpg";

/** Official KNUST campus health facilities shown on the public homepage. */

export const CAMPUS_FACILITIES = [
  {
    id: "knust-hospital",
    name: "KNUST Hospital",
    org: "University Health Services",
    kind: "District-level hospital",
    status: "Open 24 hours",
    photo: knustHospitalPhoto,
    photoAlt: "Entrance to KNUST University Hospital, with the green University Hospital sign",
    location: "North-eastern campus, Kumasi–Accra Highway (N6)",
    plusCode: "MCPG+GCX",
    description:
      "24-hour care for students, staff, and the public. OPD, wards, maternity, and specialist clinics.",
    services: ["OPD", "Emergency", "Maternity", "Dental", "Eye clinic", "Physiotherapy"],
    hoursLabel: "Open 24 hours",
    specialistNote: "Specialist clinics from 8:00 AM (Mon–Fri; obstetrics also Saturday).",
    departments: [
      { name: "Emergency", ext: "180103" },
      { name: "OPD Main", ext: "180102" },
      { name: "Maternity", ext: "180124" },
      { name: "Main pharmacy", ext: "180105" },
    ],
    phone: "+233 32 239 7998",
    otherPhones: ["+233 20 111 1049", "+233 20 111 1055"],
    whatsapp: "+233 59 789 8558",
    email: "hospital@knust.edu.gh",
    website: "https://uhs.knust.edu.gh/",
    extensionsUrl: "https://voip.knust.edu.gh/extensions?deptid=18",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=MCPG%2BGCX%20KNUST%20University%20Hospital%20N6",
    bookable: true,
  },
  {
    id: "students-clinic",
    name: "KNUST Students' Clinic",
    org: "Public health department",
    kind: "Outpatient clinic",
    status: "Mon–Fri, 8–4",
    photo: studentsClinicPhoto,
    photoAlt: "KNUST Students' Clinic building opposite Hall 7, with the campus clinic sign",
    location: "Opposite Hall 7, Africa Hall Road",
    plusCode: null,
    description:
      "General OPD, follow-up, and dressing. Book on YɛnCare and track the live queue instead of waiting in the corridor.",
    services: ["General OPD", "Follow-up / Review", "Dressing"],
    hoursLabel: "Monday to Friday, 8:00 AM – 4:00 PM",
    specialistNote: null,
    departments: [
      { name: "Nurses' station", ext: "180116" },
      { name: "Consulting room 1", ext: "180118" },
      { name: "Consulting room 2", ext: "180119" },
      { name: "Pharmacy", ext: "180117" },
    ],
    phone: null,
    otherPhones: [],
    whatsapp: null,
    email: null,
    website: null,
    extensionsUrl: "https://voip.knust.edu.gh/extensions?deptid=18",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=KNUST%20Student%20Clinic%20Africa%20Hall%20Road%20Hall%207",
    bookable: true,
  },
];
