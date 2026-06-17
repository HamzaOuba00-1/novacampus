/**
 * config/upload.config.ts
 * ---------------------------------------------------------------
 * Configuration de Multer pour la gestion des fichiers uploadés.
 *
 * Multer est un middleware Express pour le traitement
 * des requêtes multipart/form-data (upload de fichiers).
 *
 * En développement : stockage local dans ./uploads/
 * En production    : remplacer diskStorage par un fournisseur
 *                    cloud (AWS S3, MinIO, GCS) via multer-s3
 * ---------------------------------------------------------------
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Taille maximale de fichier configurable via .env (défaut : 20 Mo)
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB ?? '20', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Création du dossier d'upload s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ---------------------------------------------------------------
// Stratégie de stockage sur disque local
// ---------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Nom de fichier unique : timestamp + random + extension originale
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `resource-${uniqueSuffix}${ext}`);
  },
});

// ---------------------------------------------------------------
// Filtre des types de fichiers autorisés
// ---------------------------------------------------------------
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes = [
    'application/pdf',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
  }
};

// ---------------------------------------------------------------
// Instance Multer exportée et réutilisable dans les routes
// ---------------------------------------------------------------
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
