-- ============================================================
-- Seed data — RSM CC3 common service types & sub-services
-- Run AFTER 001_initial_schema.sql
-- ============================================================

insert into service_types (name, description) values
  ('IT Audit', 'Information Technology Audit services'),
  ('IT GRC', 'IT Governance, Risk, and Compliance'),
  ('Cybersecurity', 'Cybersecurity assessment and advisory'),
  ('ISO Certification', 'ISO standard certification assistance'),
  ('Data Privacy', 'Data privacy and protection advisory')
on conflict (name) do nothing;

insert into sub_services (service_type_id, name) values
  ((select id from service_types where name = 'IT Audit'), 'General IT Audit'),
  ((select id from service_types where name = 'IT Audit'), 'ERP Audit'),
  ((select id from service_types where name = 'IT Audit'), 'ITGC Review'),
  ((select id from service_types where name = 'IT GRC'), 'IT Risk Assessment'),
  ((select id from service_types where name = 'IT GRC'), 'IT Policy Review'),
  ((select id from service_types where name = 'IT GRC'), 'BCM/DRP'),
  ((select id from service_types where name = 'Cybersecurity'), 'Vulnerability Assessment'),
  ((select id from service_types where name = 'Cybersecurity'), 'Penetration Testing'),
  ((select id from service_types where name = 'Cybersecurity'), 'Security Assessment'),
  ((select id from service_types where name = 'ISO Certification'), 'ISO 27001'),
  ((select id from service_types where name = 'ISO Certification'), 'ISO 22301'),
  ((select id from service_types where name = 'Data Privacy'), 'PDP Gap Assessment'),
  ((select id from service_types where name = 'Data Privacy'), 'DPIA');
