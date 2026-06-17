/**
 * services/resource.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour les ressources pédagogiques d'un cours.
 *
 * Gère les fichiers uploadés via Multer (PDFs, vidéos, documents)
 * et les liens externes ajoutés manuellement.
 * ---------------------------------------------------------------
 */

import fs from 'fs';
import CourseResource from '../models/courseResource.model';
import Course from '../models/course.model';
import { ResourceType } from '../types';

/**
 * Retourne les ressources visibles d'un cours.
 * Les étudiants ne voient que les ressources isVisible=true.
 * Les enseignants et admins voient tout.
 *
 * @param courseId    - UUID du cours
 * @param showHidden  - true pour inclure les ressources masquées
 */
export async function getResourcesByCourse(courseId: string, showHidden = false) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  const where: Record<string, unknown> = { courseId };
  if (!showHidden) where['isVisible'] = true;

  return CourseResource.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Crée une ressource de type fichier après upload Multer.
 *
 * @param courseId     - UUID du cours
 * @param instructorId - UUID de l'enseignant uploadeur
 * @param file         - Fichier traité par Multer
 * @param title        - Titre affiché aux étudiants
 */
export async function createFileResource(
  courseId: string,
  instructorId: string,
  file: Express.Multer.File,
  title: string
) {
  const course = await Course.findByPk(courseId);
  if (!course) {
    // Nettoyer le fichier uploadé si le cours n'existe pas
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error('Cours introuvable.');
  }

  // Détermination du type depuis le MIME type
  let type: ResourceType = 'other';
  if (file.mimetype === 'application/pdf') type = 'pdf';
  else if (file.mimetype.startsWith('video/')) type = 'video';

  return CourseResource.create({
    courseId,
    uploadedBy: instructorId,
    title,
    type,
    storageUrl: file.path,
    fileSizeKb: Math.round(file.size / 1024),
  });
}

/**
 * Crée une ressource de type lien externe.
 *
 * @param courseId     - UUID du cours
 * @param instructorId - UUID de l'enseignant
 * @param title        - Titre du lien
 * @param url          - URL externe
 */
export async function createLinkResource(
  courseId: string,
  instructorId: string,
  title: string,
  url: string
) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  return CourseResource.create({
    courseId,
    uploadedBy: instructorId,
    title,
    type: 'link',
    storageUrl: url,
    fileSizeKb: null,
  });
}

/**
 * Bascule la visibilité d'une ressource (visible / masquée).
 */
export async function toggleResourceVisibility(resourceId: string) {
  const resource = await CourseResource.findByPk(resourceId);
  if (!resource) throw new Error('Ressource introuvable.');
  return resource.update({ isVisible: !resource.isVisible });
}

/**
 * Supprime une ressource et son fichier associé si présent.
 */
export async function deleteResource(resourceId: string) {
  const resource = await CourseResource.findByPk(resourceId);
  if (!resource) throw new Error('Ressource introuvable.');

  // Suppression du fichier local si ce n'est pas un lien externe
  if (resource.type !== 'link' && fs.existsSync(resource.storageUrl)) {
    fs.unlinkSync(resource.storageUrl);
  }

  await resource.destroy();
}
