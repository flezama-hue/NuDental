import { randomUUID } from 'node:crypto';
import type { Database } from './db.js';
import { hashPassword } from './passwords.js';

const IDS = {
  clinicA: '10000000-0000-4000-8000-000000000001',
  clinicB: '10000000-0000-4000-8000-000000000002',
  lab: '20000000-0000-4000-8000-000000000001',
  priceList: '30000000-0000-4000-8000-000000000001',
  warehouse: '40000000-0000-4000-8000-000000000001',
  location: '41000000-0000-4000-8000-000000000001',
  supplier: '50000000-0000-4000-8000-000000000001',
  products: {
    zirconia: '60000000-0000-4000-8000-000000000001',
    printedCrown: '60000000-0000-4000-8000-000000000002',
    model: '60000000-0000-4000-8000-000000000003',
  },
  inventory: {
    zirconiaDisc: '70000000-0000-4000-8000-000000000001',
    definitiveResin: '70000000-0000-4000-8000-000000000002',
    modelResin: '70000000-0000-4000-8000-000000000003',
  },
} as const;

export async function seedLocal(db: Database, password: string) {
  if (process.env.NODE_ENV === 'production') throw new Error('La carga de usuarios de prueba está deshabilitada en producción.');
  if (password.length < 12 || password.length > 128) throw new Error('LOCAL_DEMO_PASSWORD debe tener entre 12 y 128 caracteres.');

  await db.query(
    `INSERT INTO clinics(id,name,email,billing_address,credit_limit,payment_terms_days,default_payment_mode)
     VALUES($1,$2,$3,$4,$5,$6,$7),($8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,billing_address=excluded.billing_address`,
    [
      IDS.clinicA, 'Clínica demostración Lima', 'contacto.clinica.a@example.test', 'Pueblo Libre, Lima', 5000, 0, 'advance_balance',
      IDS.clinicB, 'Consultorio demostración B', 'contacto.clinica.b@example.test', 'Cusco', 0, 0, 'pay_on_delivery',
    ],
  );
  await db.query(
    `INSERT INTO laboratories(id,name,email) VALUES($1,$2,$3)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email`,
    [IDS.lab, 'NuDental Laboratorio Digital', 'laboratorio@example.test'],
  );

  await db.query(
    `INSERT INTO clinic_laboratories(clinic_id,laboratory_id) VALUES($1,$3),($2,$3)
     ON CONFLICT(clinic_id) DO UPDATE SET laboratory_id=excluded.laboratory_id,active=true`,
    [IDS.clinicA, IDS.clinicB, IDS.lab],
  );

  const records = [
    ['dentista.a@example.test', 'Dra. Andrea Demo', 'dentist', IDS.clinicA, null],
    ['dentista.b@example.test', 'Dr. Bruno Demo', 'dentist', IDS.clinicB, null],
    ['admin.a@example.test', 'Coordinadora Clínica A', 'clinic_admin', IDS.clinicA, null],
    ['laboratorio@example.test', 'Técnico de laboratorio', 'lab_technician', null, IDS.lab],
    ['admin.laboratorio@example.test', 'Administración NuDental', 'lab_manager', null, IDS.lab],
  ] as const;
  for (const [email, name, role, clinicId, labId] of records) {
    await db.query(
      `INSERT INTO app_users(id,email,name,role,clinic_id,laboratory_id,password_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,clinic_id=excluded.clinic_id,laboratory_id=excluded.laboratory_id,active=true`,
      [randomUUID(), email, name, role, clinicId, labId, await hashPassword(password)],
    );
  }

  const products = [
    [IDS.products.zirconia, 'COR-ZIR-MONO', 'Corona monolítica de zirconio', 300, 'Restauraciones fijas', 'Zirconio', 7, true],
    [IDS.products.printedCrown, 'COR-RES-DEF', 'Corona definitiva impresa', 250, 'Restauraciones fijas', 'Resina definitiva', 5, true],
    [IDS.products.model, 'MOD-IMP-COMP', 'Modelo dental impreso completo', 100, 'Impresos técnicos', 'Resina de modelo', 3, false],
  ] as const;
  for (const product of products) {
    await db.query(
      `INSERT INTO catalog_products(id,code,name,base_price,category,default_material,turnaround_days,requires_design_approval)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,base_price=excluded.base_price,category=excluded.category,default_material=excluded.default_material,turnaround_days=excluded.turnaround_days,requires_design_approval=excluded.requires_design_approval,active=true`,
      [...product],
    );
  }

  await db.query(
    `INSERT INTO price_lists(id,laboratory_id,name) VALUES($1,$2,$3)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=true`,
    [IDS.priceList, IDS.lab, 'Lista piloto NuDental 2026'],
  );
  for (const product of products) {
    await db.query(
      `INSERT INTO price_list_items(price_list_id,product_id,unit_price,turnaround_days)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(price_list_id,product_id) DO UPDATE SET unit_price=excluded.unit_price,turnaround_days=excluded.turnaround_days`,
      [IDS.priceList, product[0], product[3], product[6]],
    );
  }
  await db.query(
    `INSERT INTO clinic_price_lists(clinic_id,price_list_id) VALUES($1,$3),($2,$3)
     ON CONFLICT(clinic_id) DO UPDATE SET price_list_id=excluded.price_list_id`,
    [IDS.clinicA, IDS.clinicB, IDS.priceList],
  );

  await db.query(
    `INSERT INTO warehouses(id,laboratory_id,name) VALUES($1,$2,$3)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=true`,
    [IDS.warehouse, IDS.lab, 'Almacén principal'],
  );
  await db.query(
    `INSERT INTO warehouse_locations(id,warehouse_id,code,name) VALUES($1,$2,$3,$4)
     ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,active=true`,
    [IDS.location, IDS.warehouse, 'A-01', 'Materiales de producción'],
  );
  await db.query(
    `INSERT INTO suppliers(id,laboratory_id,name,contact_name,email,lead_time_days)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact_name=excluded.contact_name,email=excluded.email,lead_time_days=excluded.lead_time_days,active=true`,
    [IDS.supplier, IDS.lab, 'Proveedor demostración', 'Contacto Comercial', 'proveedor@example.test', 7],
  );

  const inventory = [
    [IDS.inventory.zirconiaDisc, 'ZIR-DISC-A2', 'Disco de zirconio A2', 'disco', 8, 2, true],
    [IDS.inventory.definitiveResin, 'RES-DEF-A2', 'Resina definitiva A2', 'kg', 3, 1, true],
    [IDS.inventory.modelResin, 'RES-MOD-GRIS', 'Resina para modelos gris', 'kg', 6, 1.5, true],
  ] as const;
  for (const item of inventory) {
    await db.query(
      `INSERT INTO inventory_items(id,laboratory_id,sku,name,category,unit,current_stock,minimum_stock,lot_tracking)
       VALUES($1,$2,$3,$4,'Material',$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,name=excluded.name,unit=excluded.unit,minimum_stock=excluded.minimum_stock,lot_tracking=excluded.lot_tracking,active=true`,
      [item[0], IDS.lab, item[1], item[2], item[3], item[4], item[5], item[6]],
    );
  }

  return { ...IDS, emails: records.map(record => record[0]) };
}
