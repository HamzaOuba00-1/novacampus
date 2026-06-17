/**
 * services/instructor.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion des profils enseignants.
 *
 * Couvre :
 *   – Listing avec filtres (campus, département, contrat, statut)
 *   – Création et mise à jour d'un profil enseignant
 *   – Changement de statut (actif / inactif)
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Instructor from '../models/instructor.model';
import { ContractType } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

/**
 * Liste les enseignants avec filtres.
 */
export async function listInstructors(query: Record<string, string>) {
  const { campusId, department, contractType, status, search, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (campusId) where['campusId'] = campusId;
  if (department) where['department'] = department;
  if (contractType) where['contractType'] = contractType as ContractType;
  if (status) where['status'] = status;
  if (search) {
    // La recherche se fait côté auth-service pour le nom complet ;
    // ici on filtre sur département et spécialisation
    where['specialization'] = { [Op.iLike]: `%${search}%` };
  }

  const { count, rows } = await Instructor.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['department', 'ASC']],
  });

  return { instructors: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère un profil enseignant par son ID.
 */
export async function getInstructorById(id: string) {
  const instructor = await Instructor.findByPk(id);
  if (!instructor) throw new Error('Profil enseignant introuvable.');
  return instructor;
}

/**
 * Récupère un profil enseignant par son userId (auth-service).
 */
export async function getInstructorByUserId(userId: string) {
  const instructor = await Instructor.findOne({ where: { userId } });
  if (!instructor) throw new Error('Aucun profil enseignant associé à ce compte.');
  return instructor;
}

/**
 * Crée un profil enseignant.
 * Vérifie l'unicité du userId.
 */
export async function createInstructor(data: {
  userId: string;
  campusId: string;
  contractType: ContractType;
  department?: string;
  specialization?: string;
  grade?: string;
  phone?: string;
  hireDate?: Date;
}) {
  const existing = await Instructor.findOne({ where: { userId: data.userId } });
  if (existing) throw new Error('Un profil enseignant existe déjà pour ce compte utilisateur.');

  return Instructor.create({ ...data, status: 'active' });
}

/**
 * Met à jour les données d'un profil enseignant.
 */
export async function updateInstructor(
  id: string,
  data: Partial<{
    department: string;
    specialization: string;
    contractType: ContractType;
    grade: string;
    phone: string;
    hireDate: Date;
    campusId: string;
  }>
) {
  const instructor = await Instructor.findByPk(id);
  if (!instructor) throw new Error('Profil enseignant introuvable.');
  return instructor.update(data);
}

/**
 * Active ou désactive un profil enseignant.
 */
export async function setInstructorStatus(id: string, status: 'active' | 'inactive') {
  const instructor = await Instructor.findByPk(id);
  if (!instructor) throw new Error('Profil enseignant introuvable.');
  return instructor.update({ status });
}
