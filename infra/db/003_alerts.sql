CREATE UNIQUE INDEX IF NOT EXISTS incidents_open_uniq
  ON incidents (server_id, method, COALESCE(metric, ''))
  WHERE status <> 'resolved';

INSERT INTO alert_rules (name, metric, operator, threshold, duration_s, severity)
SELECT * FROM (VALUES
  ('CPU > 85 %',    'cpu_pct',  '>', 85, 300, 'warning'),
  ('RAM > 90 %',    'ram_pct',  '>', 90, 300, 'warning'),
  ('Disque > 90 %', 'disk_pct', '>', 90, 600, 'critical')
) AS v(name, metric, operator, threshold, duration_s, severity)
WHERE NOT EXISTS (SELECT 1 FROM alert_rules);
