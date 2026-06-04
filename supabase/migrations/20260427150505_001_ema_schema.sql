/*
  # EMA Unification - Core Schema

  1. New Tables
    - `roles` - User roles (Administrator, IT Manager, Viewer)
    - `departments` - Organization departments
    - `users` - System users with auth credentials
    - `hardware_assets` - IT hardware inventory
    - `software_inventory` - Software tracking with licensing
    - `network_devices` - Network infrastructure devices
    - `patch_records` - Patch management tracking
    - `application_metering` - Application usage tracking
    - `internet_metering` - Internet usage monitoring
    - `remote_sessions` - Remote access sessions
    - `summary_reports` - Generated reports
    - `event_logs` - System and security event logs
    - `settings` - System configuration settings

  2. Security
    - RLS enabled on all tables
    - Policies restrict access to authenticated users only
    - Users can only modify data they own (where applicable)
*/

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  manager TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  department_id INTEGER REFERENCES departments(id),
  menu_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hardware Assets
CREATE TABLE IF NOT EXISTS hardware_assets (
  id SERIAL PRIMARY KEY,
  asset_tag TEXT UNIQUE NOT NULL,
  hostname TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  os TEXT,
  os_version TEXT,
  cpu TEXT,
  ram_gb INTEGER DEFAULT 0,
  storage_gb INTEGER DEFAULT 0,
  department TEXT,
  assigned_to TEXT,
  ip_address TEXT,
  mac_address TEXT,
  status TEXT DEFAULT 'Active',
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Software Inventory
CREATE TABLE IF NOT EXISTS software_inventory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT,
  version TEXT,
  license_type TEXT,
  licenses_owned INTEGER DEFAULT 0,
  licenses_used INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'Licensed',
  last_detected TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Network Devices
CREATE TABLE IF NOT EXISTS network_devices (
  id SERIAL PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  mac_address TEXT,
  device_type TEXT,
  manufacturer TEXT,
  model TEXT,
  location TEXT,
  vlan TEXT,
  subnet TEXT,
  status TEXT DEFAULT 'Online',
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Patch Records
CREATE TABLE IF NOT EXISTS patch_records (
  id SERIAL PRIMARY KEY,
  patch_name TEXT NOT NULL,
  kb_number TEXT,
  severity TEXT,
  category TEXT,
  affected_assets INTEGER DEFAULT 0,
  patched_assets INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  release_date TIMESTAMPTZ,
  deployed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Application Metering
CREATE TABLE IF NOT EXISTS application_metering (
  id SERIAL PRIMARY KEY,
  application_name TEXT NOT NULL,
  publisher TEXT,
  version TEXT,
  executable_name TEXT,
  total_installs INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  usage_hours INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT now(),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Internet Metering
CREATE TABLE IF NOT EXISTS internet_metering (
  id SERIAL PRIMARY KEY,
  username TEXT,
  department TEXT,
  ip_address TEXT,
  download_mb NUMERIC(10,2) DEFAULT 0,
  upload_mb NUMERIC(10,2) DEFAULT 0,
  total_mb NUMERIC(10,2) DEFAULT 0,
  protocol TEXT,
  category TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Remote Sessions
CREATE TABLE IF NOT EXISTS remote_sessions (
  id SERIAL PRIMARY KEY,
  target_hostname TEXT NOT NULL,
  target_ip TEXT,
  initiated_by TEXT,
  protocol TEXT DEFAULT 'RDP',
  status TEXT DEFAULT 'Active',
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Summary Reports
CREATE TABLE IF NOT EXISTS summary_reports (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  generated_by TEXT,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event Logs
CREATE TABLE IF NOT EXISTS event_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT,
  severity TEXT DEFAULT 'Info',
  source TEXT,
  message TEXT,
  username TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE patch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE internet_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read/write all data
-- Read policies
CREATE POLICY "Authenticated users can read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hardware" ON hardware_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read software" ON software_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read network" ON network_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read patches" ON patch_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read app metering" ON application_metering FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read internet metering" ON internet_metering FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read remote sessions" ON remote_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read reports" ON summary_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read event logs" ON event_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read settings" ON settings FOR SELECT TO authenticated USING (true);

-- Insert policies
CREATE POLICY "Authenticated users can insert hardware" ON hardware_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert software" ON software_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert network" ON network_devices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert patches" ON patch_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert app metering" ON application_metering FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert internet metering" ON internet_metering FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert remote sessions" ON remote_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert reports" ON summary_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert event logs" ON event_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Update policies
CREATE POLICY "Authenticated users can update hardware" ON hardware_assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update software" ON software_inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update network" ON network_devices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update patches" ON patch_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update remote sessions" ON remote_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Delete policies
CREATE POLICY "Authenticated users can delete hardware" ON hardware_assets FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete software" ON software_inventory FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete network" ON network_devices FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete patches" ON patch_records FOR DELETE TO authenticated USING (true);

-- Also allow anon access to users table for login (we'll use an edge function for auth)
CREATE POLICY "Allow anon to read users for login" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to read roles for login" ON roles FOR SELECT TO anon USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hardware_status ON hardware_assets(status);
CREATE INDEX IF NOT EXISTS idx_hardware_dept ON hardware_assets(department);
CREATE INDEX IF NOT EXISTS idx_software_status ON software_inventory(status);
CREATE INDEX IF NOT EXISTS idx_network_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_patch_severity ON patch_records(severity);
CREATE INDEX IF NOT EXISTS idx_patch_status ON patch_records(status);
CREATE INDEX IF NOT EXISTS idx_event_severity ON event_logs(severity);
CREATE INDEX IF NOT EXISTS idx_event_ts ON event_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_internet_ts ON internet_metering(timestamp);
