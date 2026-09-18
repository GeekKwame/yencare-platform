import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaClock,
  FaEnvelope,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaWhatsapp,
} from "react-icons/fa";
import { CAMPUS_FACILITIES } from "../data/campusFacilities";
import { Button } from "./ui";

function Fact({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2.5 text-sm leading-6 text-text-muted">
      <Icon className="mt-1 shrink-0 text-warning" size={13} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function ExtensionList({ departments, directoryUrl }) {
  if (!departments?.length) return null;

  return (
    <div className="mt-5">
      <p className="type-label-micro text-text-subtle">Desk extensions</p>
      <ul className="mt-2 border border-clinic-border bg-surface">
        {departments.map((dept) => (
          <li
            key={dept.ext}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border-divider px-3 py-2 text-sm last:border-b-0"
          >
            <span className="text-text-muted">{dept.name}</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-primary">
              {dept.ext}
            </span>
          </li>
        ))}
      </ul>
      {directoryUrl ? (
        <a
          href={directoryUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Full campus directory <FaExternalLinkAlt className="text-[9px]" />
        </a>
      ) : null}
    </div>
  );
}

const CampusFacilities = () => {
  return (
    <section
      id="campus-facilities"
      className="scroll-mt-28 border-t border-clinic-border bg-surface px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="type-label-micro text-warning">KNUST campus</p>
          <h2 className="display-font mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
            Key medical facilities
          </h2>
          <p className="mt-4 text-sm leading-6 text-text-muted sm:text-base">
            YɛnCare books visits at both official campus sites: KNUST Hospital
            and the Students&apos; Clinic opposite Hall 7.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2">
          {CAMPUS_FACILITIES.map((facility) => (
            <article
              key={facility.id}
              className="card-clinical flex h-full flex-col overflow-hidden bg-clinic-bg"
            >
              {facility.photo ? (
                <div className="aspect-[16/10] overflow-hidden border-b border-clinic-border bg-surface">
                  <img
                    src={facility.photo}
                    alt={facility.photoAlt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-label-micro text-warning">{facility.org}</p>
                  <h3 className="display-font mt-2 text-2xl font-bold text-primary">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">{facility.kind}</p>
                </div>
                <span className="border border-accent-border bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">
                  {facility.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-text-muted">
                {facility.description}
              </p>

              <div className="mt-5 space-y-2">
                <Fact icon={FaMapMarkerAlt}>
                  {facility.location}
                  {facility.plusCode ? ` · ${facility.plusCode}` : ""}
                </Fact>
                {facility.hoursLabel ? (
                  <Fact icon={FaClock}>{facility.hoursLabel}</Fact>
                ) : null}
                {facility.phone ? (
                  <Fact icon={FaPhone}>
                    <a
                      href={`tel:${facility.phone.replace(/\s/g, "")}`}
                      className="font-semibold text-primary hover:text-accent"
                    >
                      {facility.phone}
                    </a>
                    {facility.otherPhones?.length ? (
                      <span className="block text-xs text-text-subtle">
                        Also {facility.otherPhones.join(" · ")}
                      </span>
                    ) : null}
                  </Fact>
                ) : null}
                {facility.whatsapp ? (
                  <Fact icon={FaWhatsapp}>
                    WhatsApp{" "}
                    <a
                      href={`https://wa.me/${facility.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary hover:text-accent"
                    >
                      {facility.whatsapp}
                    </a>
                  </Fact>
                ) : null}
                {facility.email ? (
                  <Fact icon={FaEnvelope}>
                    <a
                      href={`mailto:${facility.email}`}
                      className="font-semibold text-primary hover:text-accent"
                    >
                      {facility.email}
                    </a>
                  </Fact>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {facility.services.map((service) => (
                  <span
                    key={service}
                    className="border border-clinic-border bg-surface px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {service}
                  </span>
                ))}
              </div>

              {facility.specialistNote ? (
                <p className="mt-4 text-xs leading-5 text-text-muted">
                  {facility.specialistNote}
                </p>
              ) : null}

              <ExtensionList
                departments={facility.departments}
                directoryUrl={facility.extensionsUrl}
              />

              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                {facility.bookable ? (
                  <Button
                    as={Link}
                    to="/appointments?book=1"
                    variant="accent"
                    size="sm"
                    icon={<FaArrowRight className="text-xs" />}
                    iconPosition="right"
                  >
                    Book a visit
                  </Button>
                ) : null}
                <Button
                  as="a"
                  href={facility.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="sm"
                >
                  Directions
                </Button>
                {facility.website ? (
                  <Button
                    as="a"
                    href={facility.website}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                    size="sm"
                    icon={<FaExternalLinkAlt className="text-[10px]" />}
                    iconPosition="right"
                  >
                    Website
                  </Button>
                ) : null}
              </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CampusFacilities;
