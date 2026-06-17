/**
 * services/student.service.ts
 * ---------------------------------------------------------------
 * Logique métier complète pour la gestion des dossiers étudiants.
 *
 * Couvre :
 *   – Listing avec filtres multi-critères (campus, programme, statut,
 *     statut paiement, année, recherche textuelle)
 *   – Création d'un dossier avec génération automatique du numéro étudiant
 *   – Lecture du dossier complet (données + documents)
 *   – Mise à jour des données personnelles
 *   – Changement de statut (actif → suspendu, diplômé, retiré)
 *   – Mise à jour du statut de paiement (sync depuis payment-service)
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Student from '../models/student.model';
import StudentDocument from '../models/studentDocument.model';
import { StudentStatus, PaymentStatus } from '../types';
import {
  parsePagination,
  getOffset,
  buildPaginationMeta,
  generateStudentNumber,
} from '../utils/pagination.util';

// ---------------------------------------------------------------
// Listing
// ---------------------------------------------------------------

/**
 * Liste les étudiants avec filtres et pagination.
 * Utilisé par l'administration et la direction pour le suivi.
 */
export async function listStudents(query: Record<string, string>) {
  const {
    campusId,
    programId,
    status,
    paymentStatus,
    enrollmentYear,
    search,
    page: p,
    limit: l,
  } = query;

  const { page, limit } = parsePagination(p, l);
  const where: WhereOptions = {};

  if (campusId) where['campusId'] = campusId;
  if (programId) where['programId'] = programId;
  if (status) where['status'] = status as StudentStatus;
  if (paymentStatus) where['paymentStatus'] = paymentStatus as PaymentStatus;
  if (enrollmentYear) where['enrollmentYear'] = parseInt(enrollmentYear, 10);

  // Recherche textuelle sur le nom, prénom ou numéro étudiant
  if (search) {
    where[Op.or as unknown as string] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { studentNumber: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Student.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['lastName', 'ASC'], ['firstName', 'ASC']],
  });

  return { students: rows, meta: buildPaginationMeta(count, page, limit) };
}

// ---------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------

/**
 * Récupère le dossier complet d'un étudiant par son ID de profil.
 * Inclut les documents justificatifs associés.
 */
export async function getStudentById(id: string) {
  const student = await Student.findByPk(id);
  if (!student) throw new Error('Dossier étudiant introuvable.');

  const documents = await StudentDocument.findAll({
    where: { studentId: id },
    order: [['createdAt', 'DESC']],
  });

  return { ...student.toJSON(), documents };
}

/**
 * Récupère le dossier d'un étudiant par son userId (auth-service).
 * Utilisé par l'étudiant connecté pour accéder à son propre profil.
 */
export async function getStudentByUserId(userId: string) {
  const student = await Student.findOne({ where: { userId } });
  if (!student) throw new Error('Aucun dossier étudiant associé à ce compte.');

  const documents = await StudentDocument.findAll({
    where: { studentId: student.id },
    order: [['createdAt', 'DESC']],
  });

  return { ...student.toJSON(), documents };
}

// ---------------------------------------------------------------
// Création
// ---------------------------------------------------------------

/**
 * Crée un nouveau dossier étudiant.
 * Génère automatiquement le numéro étudiant au format STU-YYYY-NNNN.
 * Vérifie l'unicité du userId (un compte ne peut avoir qu'un dossier).
 */
export async function createStudent(data: {
  userId: string;
  programId: string;
  campusId: string;
  firstName: string;
  lastName: string;
  enrollmentYear: number;
  birthDate?: Date;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}) {
  // Vérifier qu'aucun dossier n'existe déjà pour ce compte utilisateur
  const existing = await Student.findOne({ where: { userId: data.userId } });
  if (existing) throw new Error('Un dossier étudiant existe déjà pour ce compte utilisateur.');

  // Génération automatique du numéro étudiant
  const studentNumber = await generateStudentNumber(data.enrollmentYear);

  return Student.create({
    ...data,
    studentNumber,
    status: 'active',
    paymentStatus: 'pending',
  });
}

// ---------------------------------------------------------------
// Mise à jour
// ---------------------------------------------------------------

/**
 * Met à jour les données personnelles d'un étudiant.
 * Certains champs sensibles (userId, studentNumber, campusId)
 * ne peuvent pas être modifiés par cette route.
 */
export async function updateStudent(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    birthDate: Date;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes: string;
    programId: string;
  }>
) {
  const student = await Student.findByPk(id);
  if (!student) throw new Error('Dossier étudiant introuvable.');
  return student.update(data);
}

/**
 * Change le statut d'un étudiant (actif, suspendu, diplômé, retiré).
 * Réservé à l'administration.
 */
export async function updateStudentStatus(id: string, status: StudentStatus) {
  const student = await Student.findByPk(id);
  if (!student) throw new Error('Dossier étudiant introuvable.');
  return student.update({ status });
}

/**
 * Met à jour le statut de paiement d'un étudiant.
 * Appelé par le payment-service lors d'un paiement ou d'un retard.
 * Permet l'affichage dans le dossier sans appel cross-service.
 */
export async function syncPaymentStatus(
  studentId: string,
  paymentStatus: PaymentStatus
) {
  const student = await Student.findByPk(studentId);
  if (!student) throw new Error('Dossier étudiant introuvable.');
  return student.update({ paymentStatus });
}

// ---------------------------------------------------------------
// Statistiques tableau de bord
// ---------------------------------------------------------------

/**
 * Retourne les compteurs de statuts pour le tableau de bord admin.
 * Filtrable par campus.
 */
export async function getStudentStats(campusId?: string) {
  const where: WhereOptions = {};
  if (campusId) where['campusId'] = campusId;

  const [total, active, suspended, graduated, withdrawn, overdue] =
    await Promise.all([
      Student.count({ where }),
      Student.count({ where: { ...where, status: 'active' } }),
      Student.count({ where: { ...where, status: 'suspended' } }),
      Student.count({ where: { ...where, status: 'graduated' } }),
      Student.count({ where: { ...where, status: 'withdrawn' } }),
      Student.count({ where: { ...where, paymentStatus: 'overdue' } }),
    ]);

  return { total, active, suspended, graduated, withdrawn, paymentOverdue: overdue };
}
