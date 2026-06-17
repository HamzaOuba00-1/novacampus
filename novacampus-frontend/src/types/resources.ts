// ============================================================
// src/types/resources.ts
// Types alignés sur academic-service – modèle CourseResource
// ============================================================

export type ResourceType = 'pdf' | 'video' | 'link' | 'other'

// ── GET /api/courses/:courseId/resources ─────────────────────
// Réponse : { status, data: { resources } }
export interface CourseResource {
  id: string
  courseId: string
  uploadedBy: string
  title: string
  type: ResourceType
  storageUrl: string       // chemin local ou URL externe pour les liens
  fileSizeKb: number | null
  isVisible: boolean
  createdAt: string
}

// ── Vue locale : ressources groupées par cours ────────────────
export interface CourseWithResources {
  courseId: string
  courseCode: string
  courseName: string
  semester: number
  resources: CourseResource[]
}

// Métadonnées par type de ressource (icône, couleur, label)
export const RESOURCE_META: Record<ResourceType, {
  label: string
  bg: string
  text: string
  icon: string   // nom Feather icon (utilisé via react-icons/fi)
  ext: string    // extension / description courte
}> = {
  pdf:   { label: 'PDF',    bg: 'bg-red-50',        text: 'text-red-600',   icon: 'FiFileText',   ext: 'PDF'   },
  video: { label: 'Vidéo',  bg: 'bg-nc-purple/10',  text: 'text-nc-purple', icon: 'FiPlay',       ext: 'Vidéo' },
  link:  { label: 'Lien',   bg: 'bg-nc-cyan/10',    text: 'text-[#006d87]', icon: 'FiExternalLink', ext: 'Lien' },
  other: { label: 'Fichier', bg: 'bg-gray-100',     text: 'text-gray-600',  icon: 'FiFile',       ext: 'Fichier' },
}

// Formater la taille en Ko/Mo
export function formatFileSize(kb: number | null): string {
  if (kb === null) return ''
  if (kb < 1024) return `${kb} Ko`
  return `${(kb / 1024).toFixed(1)} Mo`
}
