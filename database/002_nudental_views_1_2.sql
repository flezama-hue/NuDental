BEGIN;

-- NuDental v0.2: sistemas 1 (odontólogo/clínica) y 2 (administración).
-- El MRP conserva la ejecución productiva; NuDental guarda la vista comercial,
-- logística, de comunicación y el resumen sincronizado de producción.

ALTER TABLE clinics ADD COLUMN tax_id text;
ALTER TABLE clinics ADD COLUMN phone text;
ALTER TABLE clinics ADD COLUMN email text;
ALTER TABLE clinics ADD COLUMN billing_address text NOT NULL DEFAULT '';
ALTER TABLE clinics ADD COLUMN credit_limit numeric(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0);
ALTER TABLE clinics ADD COLUMN payment_terms_days integer NOT NULL DEFAULT 0 CHECK (payment_terms_days BETWEEN 0 AND 180);
ALTER TABLE clinics ADD COLUMN default_payment_mode text NOT NULL DEFAULT 'advance_balance'
  CHECK (default_payment_mode IN ('advance_balance','pay_on_delivery','monthly_invoice'));
ALTER TABLE clinics ADD COLUMN active boolean NOT NULL DEFAULT true;

ALTER TABLE laboratories ADD COLUMN phone text;
ALTER TABLE laboratories ADD COLUMN email text;
ALTER TABLE laboratories ADD COLUMN active boolean NOT NULL DEFAULT true;

CREATE TABLE clinic_laboratories (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id),
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_products ADD COLUMN category text NOT NULL DEFAULT 'General';
ALTER TABLE catalog_products ADD COLUMN default_material text;
ALTER TABLE catalog_products ADD COLUMN turnaround_days integer NOT NULL DEFAULT 7 CHECK (turnaround_days BETWEEN 1 AND 120);
ALTER TABLE catalog_products ADD COLUMN requires_design_approval boolean NOT NULL DEFAULT false;

ALTER TABLE cases ADD COLUMN reference_code text;
ALTER TABLE cases ADD COLUMN client_reference text;
ALTER TABLE cases ADD COLUMN shipping_address text NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN submission_source text NOT NULL DEFAULT 'manual'
  CHECK (submission_source IN ('manual','panda','external'));
ALTER TABLE cases ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
ALTER TABLE cases ADD COLUMN last_message_at timestamptz;
ALTER TABLE cases ADD COLUMN mrp_external_id text;
ALTER TABLE cases ADD COLUMN submitted_at timestamptz;
ALTER TABLE cases ADD COLUMN completed_at timestamptz;
CREATE UNIQUE INDEX cases_reference_code_idx ON cases(reference_code) WHERE reference_code IS NOT NULL;

ALTER TABLE case_items ADD COLUMN prescription jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE case_items ADD COLUMN technical_revision integer NOT NULL DEFAULT 1 CHECK (technical_revision > 0);
ALTER TABLE case_items ADD COLUMN mrp_work_id text;

ALTER TABLE orders ADD COLUMN payment_mode text NOT NULL DEFAULT 'advance_balance'
  CHECK (payment_mode IN ('advance_balance','pay_on_delivery','monthly_invoice'));
ALTER TABLE orders ADD COLUMN deposit_percent numeric(5,2) NOT NULL DEFAULT 10 CHECK (deposit_percent BETWEEN 0 AND 100);
ALTER TABLE orders ADD COLUMN deposit_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0);
ALTER TABLE orders ADD COLUMN status text NOT NULL DEFAULT 'accepted'
  CHECK (status IN ('draft','accepted','cancelled','completed'));
ALTER TABLE orders ADD COLUMN accepted_by uuid REFERENCES app_users(id);

ALTER TABLE payments ADD COLUMN external_reference text;
ALTER TABLE payments ADD COLUMN evidence_note text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN reconciled_at timestamptz;
CREATE UNIQUE INDEX payments_external_reference_idx ON payments(external_reference) WHERE external_reference IS NOT NULL;

ALTER TABLE design_versions ADD COLUMN model_label text;
ALTER TABLE design_versions ADD COLUMN review_comment text;

ALTER TABLE case_comments ADD COLUMN message_type text NOT NULL DEFAULT 'text'
  CHECK (message_type IN ('text','system','approval','quality','logistics','technical_query'));
ALTER TABLE case_comments ADD COLUMN attachment_file_id uuid REFERENCES case_files(id);
ALTER TABLE case_comments ADD COLUMN visibility text NOT NULL DEFAULT 'shared'
  CHECK (visibility IN ('shared','internal'));
ALTER TABLE case_comments ADD COLUMN read_at timestamptz;

CREATE TABLE price_lists (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  currency text NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, name)
);

CREATE TABLE price_list_items (
  price_list_id uuid NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES catalog_products(id),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  turnaround_days integer NOT NULL CHECK (turnaround_days BETWEEN 1 AND 120),
  PRIMARY KEY (price_list_id, product_id)
);

CREATE TABLE clinic_price_lists (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id),
  price_list_id uuid NOT NULL REFERENCES price_lists(id),
  effective_from date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quality_checks (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  case_item_id uuid REFERENCES case_items(id),
  result text NOT NULL CHECK (result IN ('approved','rejected','rework')),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  evidence_file_id uuid REFERENCES case_files(id),
  checked_by uuid NOT NULL REFERENCES app_users(id),
  checked_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);
CREATE INDEX quality_checks_case_idx ON quality_checks(clinic_id, case_id, checked_at DESC);

CREATE TABLE warehouses (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, name)
);

CREATE TABLE warehouse_locations (
  id uuid PRIMARY KEY,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  tax_id text,
  contact_name text,
  email text,
  phone text,
  lead_time_days integer NOT NULL DEFAULT 7 CHECK (lead_time_days BETWEEN 0 AND 365),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, name)
);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  sku text NOT NULL CHECK (length(sku) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 180),
  category text NOT NULL DEFAULT 'Material',
  unit text NOT NULL CHECK (length(unit) BETWEEN 1 AND 30),
  current_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reserved_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  lot_tracking boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, sku),
  CHECK (reserved_stock <= current_stock)
);
CREATE INDEX inventory_lab_active_idx ON inventory_items(laboratory_id, active, name);

CREATE TABLE inventory_lots (
  id uuid PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  location_id uuid REFERENCES warehouse_locations(id),
  supplier_lot text NOT NULL,
  received_at date NOT NULL DEFAULT current_date,
  expires_at date,
  accepted_quantity numeric(14,3) NOT NULL CHECK (accepted_quantity >= 0),
  available_quantity numeric(14,3) NOT NULL CHECK (available_quantity >= 0),
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('quarantine','accepted','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventory_item_id, supplier_lot),
  CHECK (available_quantity <= accepted_quantity)
);
CREATE INDEX inventory_lots_item_idx ON inventory_lots(inventory_item_id, status, expires_at);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','partially_received','received','cancelled')),
  currency text NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  expected_at date,
  approved_by uuid REFERENCES app_users(id),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, order_number)
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  received_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0),
  CHECK (received_quantity <= quantity)
);
CREATE INDEX purchase_items_order_idx ON purchase_order_items(purchase_order_id);

CREATE TABLE purchase_receipts (
  id uuid PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  received_by uuid NOT NULL REFERENCES app_users(id),
  notes text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_receipt_items (
  id uuid PRIMARY KEY,
  receipt_id uuid NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items(id),
  inventory_lot_id uuid REFERENCES inventory_lots(id),
  accepted_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
  rejected_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0)
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  inventory_lot_id uuid REFERENCES inventory_lots(id),
  movement_type text NOT NULL
    CHECK (movement_type IN ('entry','exit','adjustment_in','adjustment_out','reservation','release','consumption','return')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  reference_type text,
  reference_id uuid,
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_item_idx ON inventory_movements(inventory_item_id, created_at DESC);

CREATE TABLE inventory_reservations (
  id uuid PRIMARY KEY,
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  inventory_lot_id uuid REFERENCES inventory_lots(id),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','consumed','released','cancelled')),
  mrp_requirement_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);
CREATE INDEX inventory_reservations_case_idx ON inventory_reservations(clinic_id, case_id, status);

CREATE TABLE case_tracking_snapshots (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  stage text NOT NULL,
  customer_label text NOT NULL,
  station text,
  machine_ref text,
  responsible_name text,
  physical_location text,
  progress_percent smallint CHECK (progress_percent BETWEEN 0 AND 100),
  progress_kind text NOT NULL DEFAULT 'unavailable'
    CHECK (progress_kind IN ('measured','estimated','unavailable')),
  blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','mrp','machine')),
  production_ready_at timestamptz,
  updated_by uuid REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, case_id),
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);

CREATE TABLE case_assignments (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  external_user_ref text,
  visible_name text NOT NULL,
  responsibility text NOT NULL,
  stage text,
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);
CREATE INDEX case_assignments_case_idx ON case_assignments(clinic_id, case_id, active);

CREATE TABLE shipments (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  shipment_type text NOT NULL DEFAULT 'delivery'
    CHECK (shipment_type IN ('delivery','return','pickup')),
  carrier text NOT NULL CHECK (length(carrier) BETWEEN 2 AND 120),
  service text NOT NULL DEFAULT 'regular',
  tracking_code text,
  status text NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared','scheduled','dispatched','delivered','incident','cancelled')),
  delivery_address text NOT NULL,
  collection_instruction text NOT NULL DEFAULT 'none'
    CHECK (collection_instruction IN ('none','collect_balance','collect_total')),
  scheduled_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  received_by_name text,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);
CREATE INDEX shipments_case_idx ON shipments(clinic_id, case_id, created_at DESC);
CREATE INDEX shipments_status_idx ON shipments(status, scheduled_at);

CREATE TABLE shipment_items (
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  case_item_id uuid NOT NULL REFERENCES case_items(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (shipment_id, case_item_id)
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  invoice_number text NOT NULL UNIQUE,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  currency text NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (paid_amount <= total)
);
CREATE INDEX invoices_clinic_status_idx ON invoices(clinic_id, status, due_date);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  case_id uuid NOT NULL,
  shipment_id uuid REFERENCES shipments(id),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  FOREIGN KEY (clinic_id, case_id) REFERENCES cases(clinic_id, id)
);

CREATE TABLE notification_outbox (
  id uuid PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('in_app','email','whatsapp')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('clinic','laboratory','user')),
  recipient_id uuid NOT NULL,
  template_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_outbox_pending_idx ON notification_outbox(status, next_attempt_at);

CREATE TABLE integration_outbox (
  id uuid PRIMARY KEY,
  destination text NOT NULL CHECK (destination IN ('mrp','panda','storage','billing')),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX integration_outbox_pending_idx ON integration_outbox(destination, status, next_attempt_at);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id, created_at DESC);

INSERT INTO schema_migrations(version) VALUES ('002');
COMMIT;
