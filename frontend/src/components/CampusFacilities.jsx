import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaClock,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaPhone,
} from "react-icons/fa";
import { CAMPUS_FACILITIES } from "../data/campusFacilities";

const CampusFacilities = () => {
  return (
    <section
      id="campus-facilities"
      className="scroll-mt-28 border-t border-[#dce8df] bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
            KNUST campus
          </p>
          <h2 className="display-font mt-3 text-3xl font-bold leading-tight text-[#173b3a] sm:text-4xl">
            Key medical facilities
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#607672] sm:text-base">
            Book outpatient visits at the Students&apos; Clinic or the Social
            Science Block GF7 satellite. KNUST Hospital is the 24-hour
            University Health Services site for emergency and specialist care.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {CAMPUS_FACILITIES.map((facility) => (
            <article
              key={facility.id}
              className="flex h-full flex-col rounded-[1.75rem] border border-[#dce8df] bg-[#f8faf6] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c37d32]">
                    {facility.org}
                  </p>
                  <h3 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#728681]">{facility.kind}</p>
                </div>
                <span className="rounded-full bg-[#e8f3e8] px-3 py-1.5 text-xs font-bold text-[#176b5f]">
                  {facility.status}
                </span>
              </div>

              <p className="mt-5 text-sm leading-6 text-[#607672]">
                {facility.description}
              </p>

              <div className="mt-5 space-y-2 text-sm text-[#55706c]">
                <p className="flex items-start gap-2">
                  <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#c37d32]" />
                  <span>
                    {facility.location}
                    {facility.plusCode ? ` · ${facility.plusCode}` : ""}
                  </span>
                </p>
                {facility.hoursLabel && (
                  <p className="flex items-start gap-2">
                    <FaClock className="mt-0.5 shrink-0 text-[#c37d32]" />
                    <span>{facility.hoursLabel}</span>
                  </p>
                )}
                {(facility.phones?.length ? facility.phones : facility.phone ? [facility.phone] : []).map(
                  (phone) => (
                    <p key={phone} className="flex items-start gap-2">
                      <FaPhone className="mt-0.5 shrink-0 text-[#c37d32]" />
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="font-semibold transition hover:text-[#176b5f]"
                      >
                        {phone}
                      </a>
                    </p>
                  ),
                )}
                {facility.whatsapp && (
                  <p className="text-sm">
                    WhatsApp{" "}
                    <a
                      href={`https://wa.me/${facility.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold transition hover:text-[#176b5f]"
                    >
                      {facility.whatsapp}
                    </a>
                  </p>
                )}
                {facility.email && (
                  <p>
                    <a
                      href={`mailto:${facility.email}`}
                      className="font-semibold transition hover:text-[#176b5f]"
                    >
                      {facility.email}
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {facility.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border border-[#d7e6d8] bg-white px-3 py-1 text-xs font-semibold text-[#173b3a]"
                  >
                    {service}
                  </span>
                ))}
              </div>

              {facility.specialistHours?.length ? (
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8da19a]">
                    Specialist clinic hours
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[#55706c]">
                    {facility.specialistHours.map((clinic) => (
                      <li key={clinic.name} className="flex justify-between gap-3">
                        <span>{clinic.name}</span>
                        <span className="shrink-0 font-semibold text-[#173b3a]">
                          {clinic.hours}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {facility.departments?.length ? (
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8da19a]">
                    Campus extensions
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-[#55706c] sm:grid-cols-2">
                    {facility.departments.map((dept) => (
                      <li key={dept.ext} className="flex justify-between gap-3">
                        <span>{dept.name}</span>
                        <span className="font-semibold tabular-nums text-[#173b3a]">
                          {dept.ext}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {facility.extensionsUrl ? (
                    <a
                      href={facility.extensionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#176b5f] transition hover:underline"
                    >
                      Full campus directory <FaExternalLinkAlt className="text-[9px]" />
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                {facility.bookable ? (
                  <Link
                    to="/appointments"
                    className="inline-flex items-center gap-2 rounded-full bg-[#176b5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12584f]"
                  >
                    Book a visit <FaArrowRight className="text-xs" />
                  </Link>
                ) : null}
                <a
                  href={facility.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#dce8df] bg-white px-5 py-2.5 text-sm font-semibold text-[#173b3a] transition hover:border-[#176b5f]"
                >
                  Directions
                </a>
                {facility.website ? (
                  <a
                    href={facility.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dce8df] bg-white px-5 py-2.5 text-sm font-semibold text-[#173b3a] transition hover:border-[#176b5f]"
                  >
                    Website <FaExternalLinkAlt className="text-[10px]" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <aside className="mt-5 rounded-[1.75rem] border border-[#dce8df] bg-[#f8faf6] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c37d32]">
              Satellite consultation post
            </p>
            <h3 className="mt-2 text-xl font-bold text-[#173b3a]">
              Social Science Block GF7
            </h3>
            <p className="mt-1 text-sm text-[#728681]">
              Social Science Building, Ground Floor · Mon–Fri 9:00 AM – 3:00 PM
            </p>
          </div>
          <Link
            to="/appointments"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#176b5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12584f] sm:mt-0"
          >
            Book at GF7 <FaArrowRight className="text-xs" />
          </Link>
        </aside>
      </div>
    </section>
  );
};

export default CampusFacilities;
