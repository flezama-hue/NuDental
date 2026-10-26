/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Case, Patient, Technician, AppNotification } from './types';

export const initialPatients: Patient[] = [
  { id: 'P01', name: 'Carlos Mendoza', birthDate: '1985-04-12', gender: 'Masculino', internalId: 'HC-99812', lastCaseId: '#045' },
  { id: 'P02', name: 'María Elena Portal', birthDate: '1973-11-23', gender: 'Femenino', internalId: 'HC-94520', lastCaseId: '#043' },
  { id: 'P03', name: 'Alejandro Ruiz', birthDate: '1992-08-05', gender: 'Masculino', internalId: 'HC-88491', lastCaseId: '#041' },
  { id: 'P04', name: 'Gisela Bartra', birthDate: '1968-02-17', gender: 'Femenino', internalId: 'HC-77312', lastCaseId: '#039' },
  { id: 'P05', name: 'Juan De Dios', birthDate: '1980-09-30', gender: 'Masculino', internalId: 'HC-66441', lastCaseId: '#037' },
  { id: 'P06', name: 'Sofía Luján', birthDate: '2001-07-14', gender: 'Femenino', internalId: 'HC-11204' },
  { id: 'P07', name: 'Roberto Torres', birthDate: '1959-12-01', gender: 'Masculino', internalId: 'HC-55421' },
  { id: 'P08', name: 'Camila Pinedo', birthDate: '1995-10-10', gender: 'Femenino', internalId: 'HC-11993' },
  { id: 'P09', name: 'Mateo Benavides', birthDate: '1988-03-25', gender: 'Masculino', internalId: 'HC-44589' },
  { id: 'P10', name: 'Carmen Alva', birthDate: '1979-05-31', gender: 'Femenino', internalId: 'HC-33882' }
];

export const initialTechnicians: Technician[] = [
  { id: 'T01', name: 'Téc. Renzo Castro', specialty: 'Prótesis Fija', avatarColor: 'from-[#567C8D] to-[#2F4156]', online: true },
  { id: 'T02', name: 'Téc. Vanessa Ortiz', specialty: 'Estética Dental', avatarColor: 'from-[#2F4156] to-[#567C8D]', online: true },
  { id: 'T03', name: 'Téc. Fernando Ruiz', specialty: 'Implantología', avatarColor: 'from-[#C8D9E6] to-[#2F4156]', online: true }
];

export const initialNotifications: AppNotification[] = [
  { id: 'N01', text: 'Tu caso #045 fue aceptado por Nova Dental', caseId: '#045', time: 'Hace 10 min', read: false },
  { id: 'N02', text: 'Nuevo mensaje del técnico en caso #043', caseId: '#043', time: 'Hace 2 horas', read: false },
  { id: 'N03', text: 'Tu restauración #041 está en camino — entrega estimada mañana', caseId: '#041', time: 'Hace 1 día', read: false },
  { id: 'N04', text: 'AI Scan Review detectó un hallazgo en el caso que estás preparando', time: 'Hace 1 día', read: true },
  { id: 'N05', text: 'Caso #039 entregado — confirma la recepción', caseId: '#039', time: 'Hace 2 días', read: true },
  { id: 'N06', text: 'Técnico disponible para tu caso urgente #043', caseId: '#043', time: 'Hace 3 horas', read: false }
];

export const initialCases: Case[] = [
  {
    id: '#045',
    patientId: 'P01',
    patientName: 'Carlos Mendoza',
    caseName: 'REST-MENDOZA-11',
    sentDate: '2026-05-30',
    deliveryDate: '2026-06-05',
    status: 'Aceptado',
    urgency: 'estandar',
    teeth: [11],
    isBridge: false,
    product: 'Corona disilicato de litio',
    price: 300,
    paymentStatus: 'pagado',
    material: 'Disilicato de Litio (IPS e.max)',
    shade: 'A2',
    instructions: 'Por favor lograr alta translucidez y adaptar caracterización incisal detallada según fotografía adjunta.',
    files: [
      { name: 'MANDIBULAR_MENDOZA.stl', size: '14.2 MB', date: '2026-05-30', type: 'stl' },
      { name: 'MAXILLARY_MENDOZA.stl', size: '15.8 MB', date: '2026-05-30', type: 'stl' },
      { name: 'FOTO_CLINICA_11.jpg', size: '2.4 MB', date: '2026-05-30', type: 'photo' }
    ],
    aiReview: {
      completeScan: true,
      underCutWarning: false,
      occlusalSpace: true,
      marginWarning: false
    },
    rating: null,
    chat: [
      { id: 'm1', sender: 'doctor', text: 'Hola, adjunté la foto clínica para el tema de translucidez incisal.', time: '2026-05-30 11:15' },
      { id: 'm2', sender: 'lab', text: 'Recibido Dr. García. El caso ya está validado por diseño y la caracterización se hará con maquillaje premium.', time: '2026-05-30 14:10' }
    ],
    priorCalls: [
      {
        id: 'c1',
        caseId: '#045',
        caseName: 'REST-MENDOZA-11',
        date: '2026-05-30',
        duration: '04:12',
        technician: 'Téc. Renzo Castro',
        notes: 'Discutimos el margen de preparación en distal. El doctor autorizó ampliar levemente el alivio para facilitar el asentamiento.',
        snapshots: ['/snap1.png']
      }
    ]
  },
  {
    id: '#043',
    patientId: 'P02',
    patientName: 'María Elena Portal',
    caseName: 'PUENTE-PORTAL-S2',
    sentDate: '2026-06-01',
    deliveryDate: '2026-06-03',
    status: 'Aprobación de diseño',
    urgency: 'express',
    teeth: [24, 25],
    isBridge: true,
    product: 'Corona zirconio',
    price: 200,
    paymentStatus: 'pagado',
    material: 'Zirconio Multicapa Translúcido de Alta Resistencia',
    shade: 'A3',
    instructions: 'La paciente tiene urgencia. Es un puente de 2 piezas (premolares). Diseñar con conectores reforzados.',
    files: [
      { name: 'INF_SC_PORTAL.ply', size: '12.1 MB', date: '2026-06-01', type: 'ply' },
      { name: 'SUP_SC_PORTAL.ply', size: '13.4 MB', date: '2026-06-01', type: 'ply' }
    ],
    aiReview: {
      completeScan: true,
      underCutWarning: true,
      occlusalSpace: true,
      marginWarning: false
    },
    rating: null,
    designApproval: { sentDate: '2026-06-02', modelLabel: 'DISEÑO_CAD_3D_043', status: 'pendiente' },
    chat: [
      { id: 'm3', sender: 'doctor', text: 'Buenas tardes, es urgente para el miércoles por favor, la paciente viaja.', time: '2026-06-01 09:30' },
      { id: 'm4', sender: 'lab', text: 'Hola Dr. García, el escaneo es excelente. Iniciamos proceso de fresado en zirconio translúcido. El caso priorizado va con despacho express.', time: '2026-06-01 10:45' }
    ],
    priorCalls: []
  },
  {
    id: '#041',
    patientId: 'P03',
    patientName: 'Alejandro Ruiz',
    caseName: 'CARILLAS-ESTETICAS-RUIZ',
    sentDate: '2026-05-28',
    deliveryDate: '2026-06-03',
    status: 'En camino',
    urgency: 'estandar',
    teeth: [12, 11, 21, 22],
    isBridge: false,
    product: 'Carilla de disilicato de litio x pieza',
    price: 250,
    paymentStatus: 'pagado',
    material: 'Disilicato de Litio prensado',
    shade: 'B1',
    instructions: 'Estudio de sonrisa. Lograr un tono B1 altamente natural, con bordes incisales ligeramente traslúcidos.',
    files: [
      { name: 'PREP_SUP_RUIZ.stl', size: '19.4 MB', date: '2026-05-28', type: 'stl' },
      { name: 'ANTAG_INF_RUIZ.stl', size: '18.1 MB', date: '2026-05-28', type: 'stl' },
      { name: 'PLANNING_AESTHETICS.obj', size: '32.1 MB', date: '2026-05-28', type: 'obj' }
    ],
    aiReview: {
      completeScan: true,
      underCutWarning: false,
      occlusalSpace: true,
      marginWarning: false
    },
    rating: null,
    chat: [
      { id: 'm5', sender: 'lab', text: 'Diseño terminado. ¿Confirmamos el mockup digital que enviamos por correo?', time: '2026-05-29 08:30' },
      { id: 'm6', sender: 'doctor', text: 'Sí, confirmado, se ve espectacular la proporción de los centrales.', time: '2026-05-29 09:12' },
      { id: 'm7', sender: 'lab', text: 'Excelente, está saliendo en la ruta de distribución de hoy. Debe llegar a su clínica por la tarde.', time: '2026-06-02 11:20' }
    ],
    priorCalls: []
  },
  {
    id: '#039',
    patientId: 'P04',
    patientName: 'Gisela Bartra',
    caseName: 'IMPLANTE-BARTRA-46',
    sentDate: '2026-05-20',
    deliveryDate: '2026-05-26',
    status: 'Entregado',
    urgency: 'estandar',
    teeth: [46],
    isBridge: false,
    product: 'Corona sobre implante de zirconio',
    price: 180,
    paymentStatus: 'pagado',
    material: 'Zirconio cementado sobre base de Titanio Link',
    shade: 'A3.5',
    instructions: 'Corona atornillada sobre pilar de titanio Nova Dental. Torque recomendado 35Ncm.',
    files: [
      { name: 'SCANBODY_BARTRA.stl', size: '15.5 MB', date: '2026-05-20', type: 'stl' },
      { name: 'FOTO_GINGIVA_46.jpg', size: '1.2 MB', date: '2026-05-20', type: 'photo' }
    ],
    aiReview: {
      completeScan: true,
      underCutWarning: false,
      occlusalSpace: true,
      marginWarning: false
    },
    rating: {
      score: 5,
      comment: 'Ajuste perfecto del perfil de emergencia, excelente anatomía oclusal. El pilar encajó de forma ideal sin retocar el punto de contacto.',
      reqRemake: false
    },
    chat: [],
    priorCalls: []
  },
  {
    id: '#037',
    patientId: 'P05',
    patientName: 'Juan De Dios',
    caseName: 'CORONA-JUAN-36',
    sentDate: '2026-05-25',
    deliveryDate: '2026-05-30',
    status: 'Rechazado',
    urgency: 'estandar',
    teeth: [36],
    isBridge: false,
    product: 'Corona metal porcelana',
    price: 120,
    paymentStatus: 'pagado',
    material: 'Porcelana Fundida sobre Metal (Co-Cr)',
    shade: 'A3',
    instructions: 'Lograr buena anatomía dental y oclusión pasiva.',
    files: [
      { name: 'SCAN_INF_36.stl', size: '11.1 MB', date: '2026-05-25', type: 'stl' }
    ],
    aiReview: {
      completeScan: true,
      underCutWarning: false,
      occlusalSpace: false,
      marginWarning: true
    },
    rating: null,
    chat: [
      { id: 'm8', sender: 'lab', text: 'Margen de escaneo poco visible en zona lingual. Por favor, verificar o solicitar soporte con diseño clínico.', time: '2026-05-26 15:40' }
    ],
    priorCalls: [
      {
        id: 'c2',
        caseId: '#037',
        caseName: 'CORONA-JUAN-36',
        date: '2026-05-26',
        duration: '06:45',
        technician: 'Téc. Fernando Ruiz',
        notes: 'Conversamos sobre la línea de terminación lingual de la preparación, se intentó resolver mediante software de diseño pero requiere re-preparar o retraer encía para nuevo escaneo.',
        snapshots: []
      }
    ]
  }
];

// --- Additional historical cases (this month) to complete monthly volume ---
// These extend the 5 detailed cases above so totals, history and the
// case-type distribution reflect a realistic monthly throughput.
type FillerSpec = {
  id: string;
  patient: { id: string; name: string };
  product: string;
  price: number;
  isBridge: boolean;
  material: string;
  shade: string;
  teeth: number[];
  status: Case['status'];
  sentDate: string;
  deliveryDate: string;
  reqRemake?: boolean;
};

const fillerSpecs: FillerSpec[] = [
  // Coronas (+6)
  { id: '#035', patient: { id: 'P06', name: 'Sofía Luján' }, product: 'Corona disilicato de litio', price: 300, isBridge: false, material: 'Disilicato de Litio (IPS e.max)', shade: 'A1', teeth: [21], status: 'Entregado', sentDate: '2026-05-22', deliveryDate: '2026-05-26' },
  { id: '#033', patient: { id: 'P07', name: 'Roberto Torres' }, product: 'Corona zirconio', price: 200, isBridge: false, material: 'Zirconio Multicapa de Alta Resistencia', shade: 'A3', teeth: [16], status: 'Entregado', sentDate: '2026-05-18', deliveryDate: '2026-05-22' },
  { id: '#031', patient: { id: 'P08', name: 'Camila Pinedo' }, product: 'Corona metal porcelana', price: 120, isBridge: false, material: 'Porcelana Fundida sobre Metal (Co-Cr)', shade: 'A2', teeth: [26], status: 'En producción', sentDate: '2026-05-31', deliveryDate: '2026-06-04' },
  { id: '#029', patient: { id: 'P09', name: 'Mateo Benavides' }, product: 'Corona disilicato de litio', price: 300, isBridge: false, material: 'Disilicato de Litio (IPS e.max)', shade: 'B2', teeth: [13], status: 'Aceptado', sentDate: '2026-05-29', deliveryDate: '2026-06-02' },
  { id: '#027', patient: { id: 'P10', name: 'Carmen Alva' }, product: 'Corona zirconio', price: 200, isBridge: false, material: 'Zirconio Monolítico', shade: 'A3.5', teeth: [36], status: 'Entregado', sentDate: '2026-05-15', deliveryDate: '2026-05-19' },
  { id: '#025', patient: { id: 'P01', name: 'Carlos Mendoza' }, product: 'Corona metal porcelana', price: 120, isBridge: false, material: 'Porcelana Fundida sobre Metal (Co-Cr)', shade: 'A2', teeth: [12], status: 'Enviado', sentDate: '2026-06-01', deliveryDate: '2026-06-05' },
  // Carillas (+4)
  { id: '#023', patient: { id: 'P02', name: 'María Elena Portal' }, product: 'Carilla de disilicato de litio x pieza', price: 250, isBridge: false, material: 'Disilicato de Litio prensado', shade: 'B1', teeth: [11, 21], status: 'Entregado', sentDate: '2026-05-12', deliveryDate: '2026-05-16' },
  { id: '#021', patient: { id: 'P06', name: 'Sofía Luján' }, product: 'Carilla de zirconio x pieza', price: 180, isBridge: false, material: 'Zirconio estratificado', shade: 'A1', teeth: [12, 11, 21, 22], status: 'Entregado', sentDate: '2026-05-30', deliveryDate: '2026-06-03' },
  { id: '#019', patient: { id: 'P08', name: 'Camila Pinedo' }, product: 'Carilla de disilicato de litio x pieza', price: 250, isBridge: false, material: 'Disilicato de Litio prensado', shade: 'B1', teeth: [13, 23], status: 'Entregado', sentDate: '2026-05-10', deliveryDate: '2026-05-14' },
  { id: '#017', patient: { id: 'P10', name: 'Carmen Alva' }, product: 'Carilla de zirconio x pieza', price: 180, isBridge: false, material: 'Zirconio estratificado', shade: 'A2', teeth: [22], status: 'Aceptado', sentDate: '2026-05-28', deliveryDate: '2026-06-01' },
  // Puentes (+3) — coronas de zirconio conectadas en puente
  { id: '#015', patient: { id: 'P05', name: 'Juan De Dios' }, product: 'Corona zirconio', price: 200, isBridge: true, material: 'Zirconio Multicapa de Alta Resistencia', shade: 'A3', teeth: [14, 15, 16], status: 'Entregado', sentDate: '2026-05-08', deliveryDate: '2026-05-13' },
  { id: '#013', patient: { id: 'P07', name: 'Roberto Torres' }, product: 'Corona metal porcelana', price: 120, isBridge: true, material: 'Porcelana Fundida sobre Metal (Co-Cr)', shade: 'A3.5', teeth: [44, 45, 46], status: 'En producción', sentDate: '2026-05-31', deliveryDate: '2026-06-04' },
  { id: '#011', patient: { id: 'P09', name: 'Mateo Benavides' }, product: 'Corona zirconio', price: 200, isBridge: true, material: 'Zirconio Monolítico', shade: 'B2', teeth: [13, 14, 15, 16], status: 'Entregado', sentDate: '2026-05-05', deliveryDate: '2026-05-10' },
  // Implantes (+2)
  { id: '#009', patient: { id: 'P04', name: 'Gisela Bartra' }, product: 'Corona sobre implante de zirconio', price: 180, isBridge: false, material: 'Zirconio sobre base de Titanio', shade: 'A3', teeth: [36], status: 'Entregado', sentDate: '2026-05-03', deliveryDate: '2026-05-08' },
  { id: '#007', patient: { id: 'P03', name: 'Alejandro Ruiz' }, product: 'Prótesis híbrida total sobre implante', price: 1000, isBridge: false, material: 'Estructura de Titanio con dientes de resina/zirconio', shade: 'A2', teeth: [], status: 'Aceptado', sentDate: '2026-05-27', deliveryDate: '2026-06-01' },
  // Prótesis removible (+2)
  { id: '#005', patient: { id: 'P07', name: 'Roberto Torres' }, product: 'PPR base metálica - wipla', price: 100, isBridge: false, material: 'Estructura de Cromo-Cobalto (Wipla)', shade: 'A3.5', teeth: [34, 35, 36, 37], status: 'Entregado', sentDate: '2026-05-02', deliveryDate: '2026-05-07' },
  { id: '#003', patient: { id: 'P04', name: 'Gisela Bartra' }, product: 'Prótesis total', price: 300, isBridge: false, material: 'Acrílico termocurado de alta densidad', shade: 'B1', teeth: [], status: 'En producción', sentDate: '2026-05-31', deliveryDate: '2026-06-05' },
];

const buildFillerCase = (s: FillerSpec): Case => ({
  id: s.id,
  patientId: s.patient.id,
  patientName: s.patient.name,
  caseName: `${s.product.split(' ')[0].toUpperCase()}-${s.patient.name.split(' ')[0].toUpperCase()}-${s.id.replace('#', '')}`,
  sentDate: s.sentDate,
  deliveryDate: s.deliveryDate,
  status: s.status,
  urgency: 'estandar',
  teeth: s.teeth,
  isBridge: s.isBridge,
  product: s.product,
  price: s.price,
  paymentStatus: s.status === 'En producción' ? 'pendiente' : 'pagado',
  material: s.material,
  shade: s.shade,
  instructions: 'Caso estándar procesado dentro del flujo clínico habitual de Nova Dental.',
  files: [
    { name: `SCAN_${s.id.replace('#', '')}.stl`, size: '13.5 MB', date: s.sentDate, type: 'stl' },
  ],
  aiReview: {
    completeScan: true,
    underCutWarning: false,
    occlusalSpace: true,
    marginWarning: false,
  },
  rating: s.status === 'Entregado'
    ? { score: 5, comment: 'Trabajo entregado conforme a lo solicitado.', reqRemake: !!s.reqRemake }
    : null,
  chat: [],
  priorCalls: [],
});

initialCases.push(...fillerSpecs.map(buildFillerCase));
