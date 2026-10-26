BEGIN;
-- Logical model v0.1. Only identity/sessions and patients have implemented API routes.
CREATE TABLE clinics (id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name)>0), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE laboratories (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE app_users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(email=lower(email)), name text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('clinic_admin','dentist','lab_manager','lab_technician')),
 clinic_id uuid REFERENCES clinics(id), laboratory_id uuid REFERENCES laboratories(id), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((role IN ('clinic_admin','dentist') AND clinic_id IS NOT NULL AND laboratory_id IS NULL) OR
        (role IN ('lab_manager','lab_technician') AND clinic_id IS NULL AND laboratory_id IS NOT NULL))
);
CREATE INDEX users_clinic_idx ON app_users(clinic_id);
CREATE INDEX users_laboratory_idx ON app_users(laboratory_id);
CREATE TABLE auth_sessions (token_hash text PRIMARY KEY CHECK(length(token_hash)=64), user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE patients (
 id uuid PRIMARY KEY, clinic_id uuid NOT NULL REFERENCES clinics(id), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 150),
 birth_date date NOT NULL, gender text NOT NULL CHECK(gender IN ('Masculino','Femenino','Otro')),
 internal_id text NOT NULL CHECK(length(internal_id) BETWEEN 1 AND 50), created_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(clinic_id,internal_id), UNIQUE(clinic_id,id)
);
CREATE INDEX patients_clinic_created_idx ON patients(clinic_id,created_at DESC,id DESC);
CREATE INDEX patients_creator_idx ON patients(created_by);
CREATE TABLE catalog_products (id uuid PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL, base_price numeric(12,2) NOT NULL CHECK(base_price>=0), active boolean NOT NULL DEFAULT true);
CREATE TABLE cases (
 id uuid PRIMARY KEY, clinic_id uuid NOT NULL REFERENCES clinics(id), patient_id uuid NOT NULL, laboratory_id uuid REFERENCES laboratories(id),
 created_by uuid NOT NULL REFERENCES app_users(id), title text NOT NULL, instructions text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','received','accepted','design_review','production','shipped','delivered','rejected','rework','cancelled')),
 urgency text NOT NULL DEFAULT 'standard' CHECK(urgency IN ('standard','express')), due_date date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(clinic_id,id), FOREIGN KEY(clinic_id,patient_id) REFERENCES patients(clinic_id,id)
);
CREATE INDEX cases_clinic_status_idx ON cases(clinic_id,status,created_at DESC);
CREATE INDEX cases_patient_idx ON cases(clinic_id,patient_id);
CREATE INDEX cases_lab_status_idx ON cases(laboratory_id,status);
CREATE INDEX cases_creator_idx ON cases(created_by);
CREATE TABLE case_items (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, product_id uuid NOT NULL REFERENCES catalog_products(id), tooth smallint CHECK(tooth BETWEEN 11 AND 48), material text, shade text, quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0), unit_price numeric(12,2) NOT NULL CHECK(unit_price>=0), FOREIGN KEY(clinic_id,case_id) REFERENCES cases(clinic_id,id));
CREATE INDEX items_case_idx ON case_items(clinic_id,case_id);
CREATE INDEX items_product_idx ON case_items(product_id);
CREATE TABLE orders (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, idempotency_key text NOT NULL, currency text NOT NULL DEFAULT 'PEN' CHECK(currency='PEN'), subtotal numeric(12,2) NOT NULL CHECK(subtotal>=0), express_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK(express_fee>=0), total numeric(12,2) NOT NULL CHECK(total=subtotal+express_fee), confirmed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(clinic_id,idempotency_key), UNIQUE(clinic_id,case_id), UNIQUE(clinic_id,id), FOREIGN KEY(clinic_id,case_id) REFERENCES cases(clinic_id,id));
CREATE TABLE case_files (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, object_key text NOT NULL UNIQUE, original_name text NOT NULL, media_type text NOT NULL, bytes bigint NOT NULL CHECK(bytes>0), sha256 text NOT NULL CHECK(length(sha256)=64), uploaded_by uuid NOT NULL REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(clinic_id,case_id,id), FOREIGN KEY(clinic_id,case_id) REFERENCES cases(clinic_id,id));
CREATE INDEX files_case_idx ON case_files(clinic_id,case_id);
CREATE INDEX files_uploader_idx ON case_files(uploaded_by);
CREATE TABLE design_versions (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, file_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','changes_requested')), reviewed_by uuid REFERENCES app_users(id), reviewed_at timestamptz, UNIQUE(clinic_id,case_id,version), FOREIGN KEY(clinic_id,case_id,file_id) REFERENCES case_files(clinic_id,case_id,id), CHECK((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status<>'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)));
CREATE INDEX designs_file_idx ON design_versions(clinic_id,case_id,file_id);
CREATE INDEX designs_reviewer_idx ON design_versions(reviewed_by);
CREATE TABLE case_comments (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, author_id uuid NOT NULL REFERENCES app_users(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000), created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(clinic_id,case_id) REFERENCES cases(clinic_id,id));
CREATE INDEX comments_case_idx ON case_comments(clinic_id,case_id,created_at);
CREATE INDEX comments_author_idx ON case_comments(author_id);
CREATE TABLE payments (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, order_id uuid NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','confirmed','rejected')), reference text, reviewed_by uuid REFERENCES app_users(id), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(clinic_id,order_id) REFERENCES orders(clinic_id,id), CHECK(status NOT IN ('confirmed','rejected') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)));
CREATE INDEX payments_order_idx ON payments(clinic_id,order_id);
CREATE INDEX payments_reviewer_idx ON payments(reviewed_by);
CREATE TABLE case_events (id uuid PRIMARY KEY, clinic_id uuid NOT NULL, case_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES app_users(id), event_type text NOT NULL, from_status text, to_status text, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(clinic_id,case_id) REFERENCES cases(clinic_id,id));
CREATE INDEX events_case_idx ON case_events(clinic_id,case_id,created_at);
CREATE INDEX events_actor_idx ON case_events(actor_id);
INSERT INTO schema_migrations(version) VALUES('001');
COMMIT;
