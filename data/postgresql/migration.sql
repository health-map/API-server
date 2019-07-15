--
-- Migration 
-- Queries for inserting old data into new structure
--

--
--
-- AGGREGATION TYPE
--
INSERT INTO 
  healthmap.aggregation_type ("name", created_at, updated_at, enabled)
VALUES
  ('Capítulos', now(), now(), true),
  ('Agrupaciones', now(), now(), true);

--
--
-- AGGREGATION
--

--
--
-- DISEASE
--

--
--
-- DISEASE AGGREGATION
--


--
--
-- PATIENT AGE
--
INSERT INTO 
  healthmap.patient_age ("name", description, start_age, end_age, period_type, privacy_level, created_at, updated_at)
VALUES
  ('INFANTE I', 'Infantes en etapa neonatal', 0, 1, 'meses', 0, now(), now()),
  ('INFANTE II', 'Infantes', 1, 12, 'meses', 0, now(), now()),
  ('INFANTE III', 'Infantes en sus primeros años', 1, 3, 'años', 0, now(), now()),
  ('NIÑO', 'Niños', 3, 10, 'años', 0, now(), now()),
  ('ADOLESCENTE', 'Adolescentes', 10, 18, 'años', 0, now(), now()),
  ('JOVEN I', 'Jóvenes', 18, 24, 'años', 0, now(), now()),
  ('JOVEN II', 'Jóvenes', 25, 34, 'años', 0, now(), now()),
  ('ADULTO I', 'Jóvenes', 35, 44, 'años', 0, now(), now()),
  ('ADULTO II', 'Adultos', 45, 54, 'años', 0, now(), now()),
  ('ADULTO III', 'Adultos', 55, 64, 'años', 0, now(), now()),
  ('ADULTO MAYOR', 'Adultos mayores', 64, 150, 'años', 0, now(), now());

--
--
-- USER ROLE
--
INSERT INTO 
  healthmap.user_role (created_at, "name", privacy_level, updated_at)
VALUES
  (now(), 'Admin', 100, now()), -- 0
  (now(), 'Autoridad', 100, now()), -- 1
  (now(), 'Estudiante', 40, now()), -- 2
  (now(), 'Investigador', 60, now()), -- 3
  (now(), 'Doctor', 90, now()); -- 4

--
--
-- USER
--
INSERT INTO 
  healthmap."user" (role_id, first_name, last_name, email, username, "password", created_at, updated_at)
VALUES
  (0, 'Leonardo', 'Kuffo', 'lkuffo@espol.edu.ec', 'lkuffo', 'admin', now(), now()),
  (0, 'Leonardo', 'Larrea', 'jalarrea@espol.edu.ec', 'jalarrea', 'admin', now(), now()),
  (2, 'Estudiante', 'Prueba', 'estudiante@espol.edu.ec', 'estudiante', 'dev', now(), now()),
  (3, 'Investigador', 'Prueba', 'investigador@espol.edu.ec', 'investigador', 'dev', now(), now()),
  (4, 'Doctor', 'Prueba', 'doctor@espol.edu.ec', 'doctor', 'dev', now(), now());


--
--
-- GEOFENCE
--

--
--
-- CITY
--

--
--
-- INSTITUTION 
--

--
--
-- DEPARTMENT 
--

--
--
-- PATIENT
--

--
--
-- GEOFENCE GROUP
--

--
--
-- GEOFENCES GROUPS
--

--
--
-- WEATHER 
--

--
--
-- CITY PLACE
--
