-- Demo data. Used by `npm run db:seed:*` and by the admin "Reset demo data"
-- button (the Worker imports this file). Keep one statement per `;` line end.
-- All people are fake: emails use the reserved example.com domain.

DELETE FROM email_log;
DELETE FROM info_requests;
DELETE FROM registrations;
DELETE FROM classes;

INSERT INTO classes (id, start_date, end_date, cert_type, price_single, price_dual, capacity, notes) VALUES
  (1, '2026-10-19', '2026-10-23', 'SPRAT/IRATA', 1700, 2300, 8, NULL),
  (2, '2026-11-02', '2026-11-06', 'SPRAT',       1700, 2300, 8, NULL),
  (3, '2026-11-16', '2026-11-20', 'SPRAT/IRATA', 1700, 2300, 8, NULL),
  (4, '2026-11-30', '2026-12-04', 'SPRAT',       1700, 2300, 8, NULL),
  (5, '2026-12-14', '2026-12-18', 'SPRAT/IRATA', 1700, 2300, 8, 'Last class before the holidays.');

-- Oct 19 SPRAT/IRATA: full (8/8) with 2 on standby
INSERT INTO registrations (id, class_id, name, email, phone, level, cert_choice, single_cert, language, status, standby_since, created_at) VALUES
  (1,  1, 'Marcus Bell',     'marcus.bell@example.com',     '281-555-0101', '1', 'dual',   NULL,    'en', 'registered', NULL, '2026-09-08T14:12:00.000Z'),
  (2,  1, 'José Hernández',  'jose.hernandez@example.com',  '832-555-0102', '1', 'dual',   NULL,    'es', 'registered', NULL, '2026-09-10T16:40:00.000Z'),
  (3,  1, 'Kayla Nguyen',    'kayla.nguyen@example.com',    '713-555-0103', '2', 'single', 'IRATA', 'en', 'registered', NULL, '2026-09-12T13:05:00.000Z'),
  (4,  1, 'Luis Castillo',   'luis.castillo@example.com',   '281-555-0104', '1', 'single', 'SPRAT', 'es', 'registered', NULL, '2026-09-15T19:22:00.000Z'),
  (5,  1, 'Derek Owens',     'derek.owens@example.com',     '346-555-0105', '3', 'dual',   NULL,    'en', 'registered', NULL, '2026-09-18T15:48:00.000Z'),
  (6,  1, 'Ana Morales',     'ana.morales@example.com',     '832-555-0106', '2', 'dual',   NULL,    'es', 'registered', NULL, '2026-09-22T17:30:00.000Z'),
  (7,  1, 'Tyler Brooks',    'tyler.brooks@example.com',    '713-555-0107', '1', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-09-25T12:15:00.000Z'),
  (8,  1, 'Carlos Mendoza',  'carlos.mendoza@example.com',  '281-555-0108', '2', 'dual',   NULL,    'es', 'registered', NULL, '2026-09-29T20:02:00.000Z'),
  (9,  1, 'Brandon Price',   'brandon.price@example.com',   '346-555-0109', '1', 'dual',   NULL,    'en', 'standby',    '2026-10-03T14:45:00.000Z', '2026-10-03T14:45:00.000Z'),
  (10, 1, 'Miguel Torres',   'miguel.torres@example.com',   '832-555-0110', '1', 'single', 'SPRAT', 'es', 'standby',    '2026-10-07T18:10:00.000Z', '2026-10-07T18:10:00.000Z');

-- Nov 2 SPRAT: nearly full (7/8)
INSERT INTO registrations (id, class_id, name, email, phone, level, cert_choice, single_cert, language, status, standby_since, created_at) VALUES
  (11, 2, 'Jake Whitfield',  'jake.whitfield@example.com',  '281-555-0111', '1', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-09-14T15:00:00.000Z'),
  (12, 2, 'Roberto Salinas', 'roberto.salinas@example.com', '832-555-0112', '2', 'single', 'SPRAT', 'es', 'registered', NULL, '2026-09-19T18:35:00.000Z'),
  (13, 2, 'Chris Delgado',   'chris.delgado@example.com',   '713-555-0113', '1', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-09-24T13:20:00.000Z'),
  (14, 2, 'Hannah Fischer',  'hannah.fischer@example.com',  '346-555-0114', '3', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-09-30T16:55:00.000Z'),
  (15, 2, 'Omar Reyes',      'omar.reyes@example.com',      '281-555-0115', '1', 'single', 'SPRAT', 'es', 'registered', NULL, '2026-10-02T19:40:00.000Z'),
  (16, 2, 'Sam Patel',       'sam.patel@example.com',       '713-555-0116', '2', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-10-06T14:05:00.000Z'),
  (17, 2, 'Wesley Grant',    'wesley.grant@example.com',    '832-555-0117', '1', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-10-09T21:10:00.000Z');

-- Nov 16 SPRAT/IRATA: 3/8. Nov 30 SPRAT: 1/8. Dec 14: empty.
INSERT INTO registrations (id, class_id, name, email, phone, level, cert_choice, single_cert, language, status, standby_since, created_at) VALUES
  (18, 3, 'Diego Fuentes',   'diego.fuentes@example.com',   '281-555-0118', '1', 'dual',   NULL,    'es', 'registered', NULL, '2026-10-01T15:25:00.000Z'),
  (19, 3, 'Lauren Kim',      'lauren.kim@example.com',      '346-555-0119', '2', 'single', 'IRATA', 'en', 'registered', NULL, '2026-10-05T17:50:00.000Z'),
  (20, 3, 'Trevor Lang',     'trevor.lang@example.com',     '713-555-0120', '1', 'dual',   NULL,    'en', 'registered', NULL, '2026-10-11T13:35:00.000Z'),
  (21, 4, 'Andre Wallace',   'andre.wallace@example.com',   '832-555-0121', '2', 'single', 'SPRAT', 'en', 'registered', NULL, '2026-10-08T18:00:00.000Z');

INSERT INTO info_requests (id, class_id, name, email, phone, message, language, handled, created_at) VALUES
  (1, 3, 'Fernando Ortiz', 'fernando.ortiz@example.com', '281-555-0131', '¿El curso se puede tomar completo en español? Tengo experiencia en andamios pero no en cuerdas.', 'es', 0, '2026-10-10T16:20:00.000Z'),
  (2, NULL, 'Rachel Moore', 'rachel.moore@example.com', '713-555-0132', 'We have 4 techs who need Level 1. Can you train at our facility in Baytown?', 'en', 0, '2026-10-12T14:45:00.000Z');
