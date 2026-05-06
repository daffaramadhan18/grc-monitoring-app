-- ============================================================
-- Seed data — service types & sub-services
-- Run AFTER 001_initial_schema.sql
-- ============================================================

insert into service_types (name) values
  ('IT GRC'),
  ('Privacy'),
  ('Cybersecurity')
on conflict (name) do nothing;

insert into sub_services (name, service_type_id) values
  ('IT Audit & Compliance',  (select id from service_types where name = 'IT GRC')),
  ('ISO',                    (select id from service_types where name = 'IT GRC')),
  ('BCM/DRP',                (select id from service_types where name = 'IT GRC')),
  ('IT Risk Assessment',     (select id from service_types where name = 'IT GRC')),
  ('PDP',                    (select id from service_types where name = 'Privacy')),
  ('DPIA',                   (select id from service_types where name = 'Privacy')),
  ('VAPT',                   (select id from service_types where name = 'Cybersecurity')),
  ('Red Teaming',            (select id from service_types where name = 'Cybersecurity')),
  ('Security Assessment',    (select id from service_types where name = 'Cybersecurity'));
