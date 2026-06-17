/**
 * services/document.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour les documents justificatifs des dossiers
 * étudiants (carte d'identité, diplômes, photos…).
 *
 * Cycle de vie complet :
 *   Upload → pending → verified ou rejected → re-upload si rejeté
 * ---------------------------------------------------------------
 */

import fs from 'fs';
import Student from '../models/student.model';
import StudentDocument from '../models/studentDocument.model';
import { DocumentType, DocumentVerificationStatus } from '../types';

/**
 * Retourne tous les documents d'un étudiant.
 * Les étudiants ne voient que leurs propres documents.
 * Les admins peuvent filtrer par statut de vérification.
 */
export async function getDocumentsByStudent(
  studentId: string,
  verificationStatus?: DocumentVerificationStatus
) {
  const student = await Student.findByPk(studentId);
  if (!student) throw new Error('Dossier étudiant introuvable.');

  const where: Record<string, unknown> = { studentId };
  if (verificationStatus) where['verificationStatus'] = verificationStatus;

  return StudentDocument.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Upload un document justificatif pour un dossier étudiant.
 * Le document est créé avec le statut 'pending' en attente de vérification.
 */
export async function uploadDocument(
  studentId: string,
  uploadedBy: string,
  file: Express.Multer.File,
  type: DocumentType,
  label: string
) {
  const student = await Student.findByPk(studentId);
  if (!student) {
    // Nettoyage du fichier si le dossier n'existe pas
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error('Dossier étudiant introuvable.');
  }

  return StudentDocument.create({
    studentId,
    uploadedBy,
    type,
    label,
    storageUrl: file.path,
    fileSizeKb: Math.round(file.size / 1024),
    verificationStatus: 'pending',
  });
}

/**
 * Vérifie ou rejette un document.
 * Réservé à l'administration.
 *
 * @param documentId      - UUID du document
 * @param verifiedBy      - UUID de l'administrateur
 * @param status          - 'verified' ou 'rejected'
 * @param rejectionReason - Obligatoire si status === 'rejected'
 */
export async function verifyDocument(
  documentId: string,
  verifiedBy: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string
) {
  const document = await StudentDocument.findByPk(documentId);
  if (!document) throw new Error('Document introuvable.');

  if (status === 'rejected' && !rejectionReason) {
    throw new Error('Le motif de rejet est obligatoire.');
  }

  return document.update({
    verificationStatus: status,
    verifiedBy,
    verifiedAt: new Date(),
    rejectionReason: status === 'rejected' ? (rejectionReason ?? null) : null,
  });
}

/**
 * Supprime un document et son fichier physique associé.
 * Un document vérifié ne peut pas être supprimé par l'étudiant.
 */
export async function deleteDocument(documentId: string, requesterId: string, isAdmin: boolean) {
  const document = await StudentDocument.findByPk(documentId);
  if (!document) throw new Error('Document introuvable.');

  // Un étudiant ne peut supprimer que ses propres documents non vérifiés
  if (!isAdmin) {
    if (document.uploadedBy !== requesterId) {
      throw new Error('Vous ne pouvez supprimer que vos propres documents.');
    }
    if (document.verificationStatus === 'verified') {
      throw new Error('Un document vérifié ne peut pas être supprimé.');
    }
  }

  // Suppression du fichier physique
  if (fs.existsSync(document.storageUrl)) {
    fs.unlinkSync(document.storageUrl);
  }

  await document.destroy();
}
