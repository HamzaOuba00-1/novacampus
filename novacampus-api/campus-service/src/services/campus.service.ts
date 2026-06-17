/**
 * services/campus.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion des campus.
 *
 * Ce service est l'unique source de vérité pour les métadonnées
 * des campus. Tous les autres microservices référencent les campus
 * via leur UUID sans dupliquer les données.
 *
 * Toute modification de campus est tracée dans l'audit log.
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Campus from '../models/campus.model';
import { CampusStatus } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';
import { createAuditEntry } from './auditLog.service';

/**
 * Liste tous les campus avec filtres optionnels.
 */
export async function listCampuses(query: Record<string, string>) {
  const { status, city, search, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (status) where['status'] = status as CampusStatus;
  if (city) where['city'] = { [Op.iLike]: `%${city}%` };
  if (search) {
    where[Op.or as unknown as string] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { city: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Campus.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['name', 'ASC']],
  });

  return { campuses: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère un campus par son identifiant UUID.
 */
export async function getCampusById(id: string) {
  const campus = await Campus.findByPk(id);
  if (!campus) throw new Error('Campus introuvable.');
  return campus;
}

/**
 * Récupère un campus par son code métier (CAMP001…).
 */
export async function getCampusByCode(code: string) {
  const campus = await Campus.findOne({ where: { code: code.toUpperCase() } });
  if (!campus) throw new Error(`Campus avec le code "${code}" introuvable.`);
  return campus;
}

/**
 * Crée un nouveau campus.
 * Vérifie l'unicité du code.
 */
export async function createCampus(
  data: {
    code: string;
    name: string;
    city: string;
    region?: string;
    address?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    directorUserId?: string;
    capacityStudents: number;
    openingDate?: Date;
  },
  actorId: string,
  ipAddress?: string
) {
  const existing = await Campus.findOne({ where: { code: data.code.toUpperCase() } });
  if (existing) throw new Error(`Un campus avec le code "${data.code}" existe déjà.`);

  const campus = await Campus.create({
    ...data,
    code: data.code.toUpperCase(),
    status: 'active',
  });

  // Traçabilité dans l'audit log
  await createAuditEntry({
    actorId,
    action: 'campus.create',
    entityType: 'Campus',
    entityId: campus.id,
    beforeState: null,
    afterState: campus.toJSON() as object,
    ipAddress: ipAddress ?? null,
    campusId: campus.id,
  });

  return campus;
}

/**
 * Met à jour les données d'un campus.
 * Persiste l'état avant/après dans l'audit log.
 */
export async function updateCampus(
  id: string,
  data: Partial<{
    name: string;
    city: string;
    region: string;
    address: string;
    postalCode: string;
    phone: string;
    email: string;
    directorUserId: string;
    capacityStudents: number;
    openingDate: Date;
    status: CampusStatus;
  }>,
  actorId: string,
  ipAddress?: string
) {
  const campus = await Campus.findByPk(id);
  if (!campus) throw new Error('Campus introuvable.');

  const beforeState = campus.toJSON() as object;
  await campus.update(data);

  await createAuditEntry({
    actorId,
    action: 'campus.update',
    entityType: 'Campus',
    entityId: id,
    beforeState,
    afterState: campus.toJSON() as object,
    ipAddress: ipAddress ?? null,
    campusId: id,
  });

  return campus;
}

/**
 * Archive un campus (soft-delete).
 * Un campus archivé n'apparaît plus dans les listes par défaut.
 */
export async function archiveCampus(id: string, actorId: string, ipAddress?: string) {
  const campus = await Campus.findByPk(id);
  if (!campus) throw new Error('Campus introuvable.');
  if (campus.status === 'archived') throw new Error('Ce campus est déjà archivé.');

  const beforeState = campus.toJSON() as object;
  await campus.update({ status: 'archived' });

  await createAuditEntry({
    actorId,
    action: 'campus.archive',
    entityType: 'Campus',
    entityId: id,
    beforeState,
    afterState: campus.toJSON() as object,
    ipAddress: ipAddress ?? null,
    campusId: id,
  });

  return campus;
}
