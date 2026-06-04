/*
  # EMA Unification - Seed Data

  Populates all tables with realistic sample data so the system
  can run immediately after setup.

  Default login: admin / Admin@123
  Password hash is bcryptjs hash of "Admin@123"
*/

-- Roles
INSERT INTO roles (name, description) VALUES
('Administrator', 'Full system access'),
('IT Manager', 'Manage IT infrastructure'),
('Viewer', 'Read-only access');

-- Departments
INSERT INTO departments (name, manager) VALUES
('IT', 'John Smith'),
('Finance', 'Sarah Johnson'),
('HR', 'Emily Davis'),
('Operations', 'Michael Brown'),
('Marketing', 'Jessica Wilson'),
('Sales', 'David Lee'),
('Engineering', 'Robert Taylor'),
('Legal', 'Amanda Martin');

-- Users (password: Admin@123, bcrypt hash)
INSERT INTO users (username, email, password_hash, role_id, department_id, menu_index) VALUES
('admin', 'admin@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, 1, 0),
('itmanager', 'itmanager@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, 1, 0),
('viewer', 'viewer@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, 2, 0);

-- Hardware Assets
INSERT INTO hardware_assets (asset_tag, hostname, manufacturer, model, serial_number, os, os_version, cpu, ram_gb, storage_gb, department, assigned_to, ip_address, mac_address, status, last_seen) VALUES
('ASSET-001', 'WKSTN-IT-001', 'Dell', 'OptiPlex 7090', 'SN123456', 'Windows 11', '23H2', 'Intel Core i7-11700', 16, 512, 'IT', 'John Smith', '192.168.1.10', '00:1A:2B:3C:4D:01', 'Active', now()),
('ASSET-002', 'WKSTN-IT-002', 'HP', 'EliteDesk 800', 'SN123457', 'Windows 11', '23H2', 'Intel Core i5-11500', 8, 256, 'IT', 'Jane Doe', '192.168.1.11', '00:1A:2B:3C:4D:02', 'Active', now()),
('ASSET-003', 'WKSTN-FIN-001', 'Lenovo', 'ThinkCentre M90q', 'SN123458', 'Windows 10', '22H2', 'Intel Core i5-10500', 8, 256, 'Finance', 'Sarah Johnson', '192.168.1.20', '00:1A:2B:3C:4D:03', 'Active', now()),
('ASSET-004', 'WKSTN-FIN-002', 'Dell', 'OptiPlex 5090', 'SN123459', 'Windows 11', '23H2', 'Intel Core i3-10105', 8, 256, 'Finance', 'Mark Wilson', '192.168.1.21', '00:1A:2B:3C:4D:04', 'Active', now() - interval '2 hours'),
('ASSET-005', 'SRVR-DC-001', 'Dell', 'PowerEdge R750', 'SN123460', 'Windows Server 2022', '21H2', 'Intel Xeon Gold 6330', 64, 2048, 'IT', 'IT Team', '192.168.0.1', '00:1A:2B:3C:4D:05', 'Active', now()),
('ASSET-006', 'SRVR-FILE-001', 'HP', 'ProLiant DL380', 'SN123461', 'Windows Server 2019', '1809', 'Intel Xeon Silver 4210', 32, 4096, 'IT', 'IT Team', '192.168.0.2', '00:1A:2B:3C:4D:06', 'Active', now()),
('ASSET-007', 'WKSTN-HR-001', 'Lenovo', 'ThinkPad E14', 'SN123462', 'Windows 11', '23H2', 'AMD Ryzen 5 5500U', 8, 512, 'HR', 'Emily Davis', '192.168.1.30', '00:1A:2B:3C:4D:07', 'Active', now() - interval '1 hour'),
('ASSET-008', 'WKSTN-OPS-001', 'Dell', 'Latitude 5520', 'SN123463', 'Windows 10', '21H2', 'Intel Core i7-1165G7', 16, 512, 'Operations', 'Michael Brown', '192.168.1.40', '00:1A:2B:3C:4D:08', 'Active', now()),
('ASSET-009', 'WKSTN-MKT-001', 'Apple', 'MacBook Pro 14', 'SN123464', 'macOS Ventura', '13.5', 'Apple M2 Pro', 16, 512, 'Marketing', 'Jessica Wilson', '192.168.1.50', '00:1A:2B:3C:4D:09', 'Active', now()),
('ASSET-010', 'WKSTN-ENG-001', 'HP', 'ZBook Studio G8', 'SN123465', 'Ubuntu 22.04', '22.04 LTS', 'Intel Core i9-11950H', 32, 1024, 'Engineering', 'Robert Taylor', '192.168.1.60', '00:1A:2B:3C:4D:10', 'Active', now()),
('ASSET-011', 'WKSTN-IT-003', 'Dell', 'OptiPlex 3090', 'SN123466', 'Windows 10', '22H2', 'Intel Core i3-10105', 4, 128, 'IT', 'Support Staff', '192.168.1.12', '00:1A:2B:3C:4D:11', 'Inactive', now() - interval '7 days'),
('ASSET-012', 'WKSTN-SAL-001', 'Lenovo', 'IdeaPad 5', 'SN123467', 'Windows 11', '22H2', 'AMD Ryzen 7 5700U', 16, 512, 'Sales', 'David Lee', '192.168.1.70', '00:1A:2B:3C:4D:12', 'Active', now()),
('ASSET-013', 'SRVR-APP-001', 'Dell', 'PowerEdge R650', 'SN123468', 'Windows Server 2022', '21H2', 'Intel Xeon Silver 4310', 32, 1024, 'IT', 'IT Team', '192.168.0.3', '00:1A:2B:3C:4D:13', 'Active', now()),
('ASSET-014', 'WKSTN-LEG-001', 'HP', 'EliteBook 850', 'SN123469', 'Windows 11', '23H2', 'Intel Core i7-1185G7', 16, 512, 'Legal', 'Amanda Martin', '192.168.1.80', '00:1A:2B:3C:4D:14', 'Active', now()),
('ASSET-015', 'WKSTN-ENG-002', 'Dell', 'Precision 3560', 'SN123470', 'Ubuntu 20.04', '20.04 LTS', 'Intel Core i7-1165G7', 32, 1024, 'Engineering', 'Chris Anderson', '192.168.1.61', '00:1A:2B:3C:4D:15', 'Maintenance', now() - interval '3 days');

-- Software Inventory
INSERT INTO software_inventory (name, vendor, version, license_type, licenses_owned, licenses_used, install_count, category, status, last_detected) VALUES
('Microsoft Office 365', 'Microsoft', '2023', 'Subscription', 50, 45, 45, 'Productivity', 'Licensed', now()),
('Adobe Creative Cloud', 'Adobe', '2023', 'Subscription', 10, 8, 8, 'Media', 'Licensed', now()),
('Visual Studio Code', 'Microsoft', '1.88.0', 'Free', 999, 12, 12, 'Development', 'Licensed', now()),
('Slack', 'Slack Technologies', '4.38.125', 'Per User', 50, 48, 48, 'Communication', 'Licensed', now()),
('Zoom', 'Zoom Video Communications', '5.17.11', 'Per User', 100, 75, 75, 'Communication', 'Licensed', now()),
('AutoCAD', 'Autodesk', '2024', 'Subscription', 5, 3, 3, 'Development', 'Licensed', now()),
('7-Zip', 'Igor Pavlov', '23.01', 'Free', 999, 0, 15, 'Utility', 'Licensed', now()),
('Notepad++', 'Don Ho', '8.6.4', 'Free', 999, 0, 20, 'Utility', 'Licensed', now()),
('VLC Media Player', 'VideoLAN', '3.0.20', 'Free', 999, 0, 18, 'Media', 'Licensed', now()),
('TeamViewer', 'TeamViewer GmbH', '15.52.3', 'Business', 5, 5, 7, 'Utility', 'Unlicensed', now()),
('Google Chrome', 'Google', '123.0.6312', 'Free', 999, 0, 42, 'Utility', 'Licensed', now()),
('Mozilla Firefox', 'Mozilla', '125.0', 'Free', 999, 0, 25, 'Utility', 'Licensed', now()),
('WinRAR', 'RARLAB', '7.00', 'Commercial', 10, 0, 14, 'Utility', 'Unlicensed', now()),
('Tableau Desktop', 'Salesforce', '2024.1', 'Per User', 3, 3, 3, 'Productivity', 'Licensed', now()),
('Python 3.12', 'Python Software Foundation', '3.12.3', 'Free', 999, 0, 8, 'Development', 'Licensed', now());

-- Network Devices
INSERT INTO network_devices (hostname, ip_address, mac_address, device_type, manufacturer, model, location, vlan, subnet, status, last_seen) VALUES
('CORE-SW-01', '192.168.0.254', 'AA:BB:CC:DD:EE:01', 'Switch', 'Cisco', 'Catalyst 9300', 'Server Room', 'VLAN1', '192.168.0.0/24', 'Online', now()),
('CORE-SW-02', '192.168.1.254', 'AA:BB:CC:DD:EE:02', 'Switch', 'Cisco', 'Catalyst 9300', 'Server Room', 'VLAN2', '192.168.1.0/24', 'Online', now()),
('EDGE-FW-01', '10.0.0.1', 'AA:BB:CC:DD:EE:03', 'Firewall', 'Fortinet', 'FortiGate 100F', 'Server Room', 'DMZ', '10.0.0.0/24', 'Online', now()),
('WIFI-AP-01', '192.168.1.200', 'AA:BB:CC:DD:EE:04', 'Access Point', 'Ubiquiti', 'UniFi AP AC Pro', 'Floor 1', 'VLAN10', '192.168.1.0/24', 'Online', now()),
('WIFI-AP-02', '192.168.1.201', 'AA:BB:CC:DD:EE:05', 'Access Point', 'Ubiquiti', 'UniFi AP AC Pro', 'Floor 2', 'VLAN10', '192.168.1.0/24', 'Online', now()),
('WIFI-AP-03', '192.168.1.202', 'AA:BB:CC:DD:EE:06', 'Access Point', 'Ubiquiti', 'UniFi AP AC Lite', 'Floor 3', 'VLAN10', '192.168.1.0/24', 'Warning', now() - interval '2 hours'),
('EDGE-RTR-01', '203.0.113.1', 'AA:BB:CC:DD:EE:07', 'Router', 'Cisco', 'ASR 1001-X', 'Server Room', 'WAN', '203.0.113.0/30', 'Online', now()),
('UPS-APC-01', '192.168.0.50', 'AA:BB:CC:DD:EE:08', 'UPS', 'APC', 'Smart-UPS 3000', 'Server Room', 'VLAN1', '192.168.0.0/24', 'Online', now()),
('PRN-HP-01', '192.168.1.100', 'AA:BB:CC:DD:EE:09', 'Printer', 'HP', 'LaserJet Pro M404', 'Office Floor 1', 'VLAN20', '192.168.1.0/24', 'Online', now()),
('PRN-HP-02', '192.168.1.101', 'AA:BB:CC:DD:EE:10', 'Printer', 'HP', 'Color LaserJet Pro', 'Office Floor 2', 'VLAN20', '192.168.1.0/24', 'Offline', now() - interval '1 day');

-- Patch Records
INSERT INTO patch_records (patch_name, kb_number, severity, category, affected_assets, patched_assets, status, release_date, deployed_date) VALUES
('Windows Security Update - April 2024', 'KB5036893', 'Critical', 'Security', 12, 12, 'Completed', '2024-04-09', '2024-04-10'),
('Windows Cumulative Update - April 2024', 'KB5036980', 'Important', 'Feature', 12, 10, 'Completed', '2024-04-09', '2024-04-12'),
('.NET Framework Security Fix', 'KB5035512', 'Critical', 'Security', 12, 12, 'Completed', '2024-03-12', '2024-03-14'),
('Windows Defender Definition Update', 'KB4052623', 'Moderate', 'Security', 15, 15, 'Completed', '2024-04-15', '2024-04-15'),
('Office 365 Monthly Update', 'N/A', 'Low', 'Feature', 45, 43, 'Completed', '2024-04-01', '2024-04-03'),
('Windows Print Spooler Vulnerability Fix', 'KB5037768', 'Critical', 'Security', 12, 8, 'In Progress', '2024-04-23', NULL),
('Edge Browser Security Update', 'KB5034679', 'Important', 'Security', 42, 42, 'Completed', '2024-04-01', '2024-04-02'),
('SQL Server 2019 CU Patch', 'KB5029375', 'Important', 'Bug Fix', 3, 0, 'Pending', '2024-04-16', NULL),
('VMware Tools Update', 'N/A', 'Low', 'Feature', 5, 5, 'Completed', '2024-03-20', '2024-03-22'),
('Windows LSASS Remote Code Execution', 'KB5036908', 'Critical', 'Security', 12, 12, 'Completed', '2024-04-09', '2024-04-10'),
('Exchange Server Security Update', 'KB5033706', 'Critical', 'Security', 2, 2, 'Completed', '2024-02-13', '2024-02-15'),
('Firmware Update - Server BIOS', 'N/A', 'Moderate', 'Firmware', 6, 2, 'In Progress', '2024-04-01', NULL),
('Kernel Side-Channel Vulnerability Patch', 'KB5034441', 'Critical', 'Security', 12, 12, 'Completed', '2024-01-09', '2024-01-12'),
('Adobe Reader Security Update', 'N/A', 'Important', 'Security', 20, 18, 'Completed', '2024-03-12', '2024-03-15'),
('OpenSSL Critical Fix', 'N/A', 'Critical', 'Security', 4, 0, 'Pending', '2024-04-20', NULL);

-- Application Metering
INSERT INTO application_metering (application_name, publisher, version, executable_name, total_installs, active_users, usage_hours, last_used, category) VALUES
('Microsoft Word', 'Microsoft', '16.0.17328', 'WINWORD.EXE', 45, 38, 1245, now(), 'Productivity'),
('Microsoft Excel', 'Microsoft', '16.0.17328', 'EXCEL.EXE', 45, 35, 1876, now(), 'Productivity'),
('Microsoft Outlook', 'Microsoft', '16.0.17328', 'OUTLOOK.EXE', 45, 44, 3201, now(), 'Communication'),
('Google Chrome', 'Google', '123.0.6312', 'chrome.exe', 42, 40, 5432, now(), 'Utility'),
('Slack', 'Slack Technologies', '4.38.125', 'slack.exe', 48, 45, 2876, now(), 'Communication'),
('Zoom', 'Zoom Video Communications', '5.17.11', 'Zoom.exe', 75, 62, 1543, now(), 'Communication'),
('Visual Studio Code', 'Microsoft', '1.88.0', 'Code.exe', 12, 10, 2341, now(), 'Development'),
('Adobe Photoshop', 'Adobe', '25.5.0', 'Photoshop.exe', 5, 4, 432, now(), 'Media'),
('AutoCAD', 'Autodesk', '24.0.53.0', 'acad.exe', 3, 3, 876, now(), 'Development'),
('Tableau Desktop', 'Salesforce', '2024.1.0', 'tableau.exe', 3, 3, 234, now(), 'Productivity'),
('Python IDLE', 'Python Foundation', '3.12.3', 'pythonw.exe', 8, 6, 543, now(), 'Development'),
('VLC Media Player', 'VideoLAN', '3.0.20', 'vlc.exe', 18, 5, 123, now(), 'Media'),
('7-Zip', 'Igor Pavlov', '23.01', '7zFM.exe', 15, 8, 45, now(), 'Utility'),
('Windows Terminal', 'Microsoft', '1.19.10821', 'WindowsTerminal.exe', 10, 8, 876, now(), 'Utility'),
('Microsoft PowerPoint', 'Microsoft', '16.0.17328', 'POWERPNT.EXE', 45, 25, 654, now(), 'Productivity');

-- Internet Metering
INSERT INTO internet_metering (username, department, ip_address, download_mb, upload_mb, total_mb, protocol, category, timestamp) VALUES
('john.smith', 'IT', '192.168.1.10', 245.50, 32.10, 277.60, 'HTTPS', 'Web', now() - interval '1 hour'),
('jane.doe', 'IT', '192.168.1.11', 189.30, 18.50, 207.80, 'HTTPS', 'Streaming', now() - interval '2 hours'),
('sarah.johnson', 'Finance', '192.168.1.20', 312.80, 45.20, 358.00, 'HTTPS', 'Web', now() - interval '3 hours'),
('michael.brown', 'Operations', '192.168.1.40', 156.40, 22.30, 178.70, 'HTTP', 'Email', now() - interval '4 hours'),
('jessica.wilson', 'Marketing', '192.168.1.50', 478.90, 67.80, 546.70, 'HTTPS', 'Streaming', now() - interval '5 hours'),
('david.lee', 'Sales', '192.168.1.70', 89.20, 12.40, 101.60, 'HTTPS', 'Web', now() - interval '6 hours'),
('robert.taylor', 'Engineering', '192.168.1.60', 567.30, 89.10, 656.40, 'HTTPS', 'File Transfer', now() - interval '7 hours'),
('emily.davis', 'HR', '192.168.1.30', 123.40, 15.60, 139.00, 'HTTPS', 'Social', now() - interval '8 hours'),
('john.smith', 'IT', '192.168.1.10', 198.70, 28.90, 227.60, 'HTTPS', 'Web', now() - interval '13 hours'),
('jane.doe', 'IT', '192.168.1.11', 345.60, 41.20, 386.80, 'FTP', 'File Transfer', now() - interval '14 hours'),
('sarah.johnson', 'Finance', '192.168.1.20', 267.40, 35.70, 303.10, 'HTTPS', 'Web', now() - interval '15 hours'),
('michael.brown', 'Operations', '192.168.1.40', 412.80, 56.30, 469.10, 'HTTPS', 'Streaming', now() - interval '16 hours'),
('jessica.wilson', 'Marketing', '192.168.1.50', 234.50, 29.80, 264.30, 'HTTPS', 'Social', now() - interval '17 hours'),
('david.lee', 'Sales', '192.168.1.70', 178.90, 23.40, 202.30, 'HTTPS', 'Web', now() - interval '18 hours'),
('robert.taylor', 'Engineering', '192.168.1.60', 623.10, 95.40, 718.50, 'HTTPS', 'File Transfer', now() - interval '19 hours'),
('emily.davis', 'HR', '192.168.1.30', 145.60, 19.20, 164.80, 'HTTPS', 'Email', now() - interval '20 hours'),
('john.smith', 'IT', '192.168.1.10', 289.30, 38.60, 327.90, 'HTTPS', 'Web', now() - interval '25 hours'),
('jane.doe', 'IT', '192.168.1.11', 167.80, 21.40, 189.20, 'HTTPS', 'Web', now() - interval '26 hours'),
('sarah.johnson', 'Finance', '192.168.1.20', 398.50, 52.10, 450.60, 'HTTPS', 'Web', now() - interval '27 hours'),
('michael.brown', 'Operations', '192.168.1.40', 234.10, 31.50, 265.60, 'HTTP', 'Email', now() - interval '28 hours'),
('jessica.wilson', 'Marketing', '192.168.1.50', 512.30, 73.40, 585.70, 'HTTPS', 'Streaming', now() - interval '29 hours'),
('david.lee', 'Sales', '192.168.1.70', 145.60, 18.90, 164.50, 'HTTPS', 'Web', now() - interval '30 hours'),
('robert.taylor', 'Engineering', '192.168.1.60', 489.20, 78.30, 567.50, 'HTTPS', 'File Transfer', now() - interval '31 hours'),
('emily.davis', 'HR', '192.168.1.30', 198.40, 24.60, 223.00, 'HTTPS', 'Social', now() - interval '32 hours'),
('john.smith', 'IT', '192.168.1.10', 356.70, 48.20, 404.90, 'HTTPS', 'Web', now() - interval '37 hours'),
('jane.doe', 'IT', '192.168.1.11', 223.40, 29.70, 253.10, 'HTTPS', 'Web', now() - interval '38 hours'),
('sarah.johnson', 'Finance', '192.168.1.20', 178.90, 23.50, 202.40, 'HTTPS', 'Email', now() - interval '39 hours'),
('michael.brown', 'Operations', '192.168.1.40', 312.60, 42.80, 355.40, 'HTTPS', 'Web', now() - interval '40 hours'),
('jessica.wilson', 'Marketing', '192.168.1.50', 445.20, 61.30, 506.50, 'HTTPS', 'Streaming', now() - interval '41 hours'),
('david.lee', 'Sales', '192.168.1.70', 267.80, 35.10, 302.90, 'HTTPS', 'Web', now() - interval '42 hours');

-- Remote Sessions
INSERT INTO remote_sessions (target_hostname, target_ip, initiated_by, protocol, status, start_time, end_time, duration_seconds) VALUES
('SRVR-DC-001', '192.168.0.1', 'admin', 'RDP', 'Completed', now() - interval '2 hours', now() - interval '1 hour', 3600),
('SRVR-FILE-001', '192.168.0.2', 'itmanager', 'RDP', 'Completed', now() - interval '5 hours', now() - interval '4 hours', 3200),
('WKSTN-ENG-001', '192.168.1.60', 'admin', 'SSH', 'Completed', now() - interval '1 day', now() - interval '23 hours', 1800),
('CORE-SW-01', '192.168.0.254', 'admin', 'SSH', 'Active', now() - interval '30 minutes', NULL, 0),
('SRVR-APP-001', '192.168.0.3', 'itmanager', 'RDP', 'Failed', now() - interval '8 hours', now() - interval '8 hours', 45),
('WKSTN-IT-001', '192.168.1.10', 'admin', 'VNC', 'Completed', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 3100);

-- Summary Reports
INSERT INTO summary_reports (title, category, generated_by, status) VALUES
('Hardware Inventory Report - April 2024', 'Hardware', 'admin', 'Completed'),
('Software Compliance Report - Q1 2024', 'Software', 'itmanager', 'Completed'),
('Network Infrastructure Audit - April 2024', 'Network', 'admin', 'Completed'),
('Patch Compliance Summary - March 2024', 'Patch', 'admin', 'Completed'),
('Full IT Infrastructure Report - Q1 2024', 'Full', 'admin', 'Completed');

-- Event Logs
INSERT INTO event_logs (event_type, severity, source, message, username, ip_address, timestamp) VALUES
('Login', 'Info', 'AuthService', 'User admin logged in successfully', 'admin', '192.168.1.10', now()),
('Login', 'Warning', 'AuthService', 'Failed login attempt for user: hacker', 'hacker', '203.0.113.50', now() - interval '5 minutes'),
('System', 'Info', 'Scheduler', 'Automated patch deployment started', 'system', '192.168.0.1', now() - interval '1 hour'),
('Alert', 'Critical', 'SecurityMonitor', 'Potential brute force attack detected from 203.0.113.50', 'system', '203.0.113.50', now() - interval '2 hours'),
('Change', 'Info', 'AssetManager', 'Hardware asset ASSET-011 status changed to Inactive', 'admin', '192.168.1.10', now() - interval '3 hours'),
('System', 'Warning', 'DiskMonitor', 'Disk usage on SRVR-FILE-001 exceeded 85%', 'system', '192.168.0.2', now() - interval '4 hours'),
('Access', 'Info', 'FileServer', 'User itmanager accessed shared drive /Finance/Q1-Reports', 'itmanager', '192.168.1.11', now() - interval '6 hours'),
('System', 'Error', 'BackupService', 'Backup job failed for SRVR-DC-001: Insufficient space', 'system', '192.168.0.1', now() - interval '8 hours'),
('Login', 'Info', 'AuthService', 'User itmanager logged in successfully', 'itmanager', '192.168.1.11', now() - interval '9 hours'),
('Alert', 'Warning', 'NetworkMonitor', 'High bandwidth usage detected on WAN interface: 95% utilization', 'system', '192.168.0.254', now() - interval '10 hours'),
('Change', 'Info', 'PatchManager', 'Patch KB5036893 deployed to 12 systems successfully', 'system', '192.168.0.1', now() - interval '1 day'),
('System', 'Critical', 'UPSMonitor', 'UPS APC-01 battery level below 20%', 'system', '192.168.0.50', now() - interval '1 day 2 hours');

-- Settings
INSERT INTO settings (key, value, description, category) VALUES
('smtp_server', 'mail.company.com', 'SMTP server for email notifications', 'Notifications'),
('smtp_port', '587', 'SMTP port number', 'Notifications'),
('smtp_from', 'ema@company.com', 'Sender email address', 'Notifications'),
('alert_email', 'alerts@company.com', 'Alert notification recipient', 'Notifications'),
('session_timeout', '480', 'Session timeout in minutes', 'Security'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'Security'),
('lockout_duration', '30', 'Account lockout duration in minutes', 'Security'),
('password_min_length', '8', 'Minimum password length', 'Security'),
('scan_interval', '60', 'Asset scan interval in minutes', 'System'),
('retention_days', '90', 'Event log retention period in days', 'System'),
('company_name', 'Acme Corporation', 'Organization name', 'System'),
('timezone', 'UTC+8', 'System timezone', 'System');
