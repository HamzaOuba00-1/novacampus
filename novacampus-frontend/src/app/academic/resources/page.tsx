'use client'

// ============================================================
// src/app/academic/resources/page.tsx
// Page Ressources pédagogiques – vue étudiant
//
//   – Barre de recherche + filtres (semestre, type)
//   – Compteurs par type (PDF / Vidéo / Lien / Autre)
//   – Liste groupée par cours, ressources cliquables
//   – Téléchargement direct (fichiers) ou ouverture (liens)
//
// APIs :
//   GET /api/academic/students/me/enrollments  (grades.service)
//   GET /api/courses/:id                        (grades.service)
//   GET /api/courses/:id/resources              (resources.service)
// ============================================================

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useResources } from '@/hooks/useResources'
import AppShell from '@/components/layout/AppShell'
import {
  FiSearch, FiInbox, FiFileText, FiPlay,
  FiExternalLink, FiFile, FiDownload, FiChevronDown,
} from 'react-icons/fi'
import clsx from 'clsx'
import { useState } from 'react'
import type { CourseResource, ResourceType } from '@/types/resources'
import { RESOURCE_META, formatFileSize } from '@/types/resources'

// ── Icône par type ─────────────────────────────────────────────
function ResourceIcon({ type, size = 16 }: { type: ResourceType; size?: number }) {
  const cls = RESOURCE_META[type].text
  if (type === 'pdf')   return <FiFileText   size={size} className={cls} />
  if (type === 'video') return <FiPlay       size={size} className={cls} />
  if (type === 'link')  return <FiExternalLink size={size} className={cls} />
  return                       <FiFile       size={size} className={cls} />
}

// ── Carte ressource individuelle ───────────────────────────────
function ResourceItem({ r }: { r: CourseResource }) {
  const meta = RESOURCE_META[r.type]
  const isLink = r.type === 'link'

  const handleOpen = () => {
    if (isLink) {
      window.open(r.storageUrl, '_blank', 'noopener,noreferrer')
    } else {
      // Télécharger via l'URL du fichier (servie par academic-service /uploads/)
      const a = document.createElement('a')
      // La storageUrl est un chemin local serveur ; en prod pointer vers S3.
      // Via gateway : /uploads/... → academic-service:3002/uploads/...
      a.href = `${process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080'}/${r.storageUrl.replace(/^\.\//, '')}`
      a.download = r.title
      a.click()
    }
  }

  const date = new Date(r.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <button
      onClick={handleOpen}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition group"
    >
      {/* Icône type */}
      <div className={clsx(
        'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
        meta.bg
      )}>
        <ResourceIcon type={r.type} size={16} />
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-nc-navy transition">
          {r.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={clsx('text-[11px] font-medium', meta.text)}>
            {meta.label}
          </span>
          {r.fileSizeKb !== null && (
            <span className="text-[11px] text-gray-400">{formatFileSize(r.fileSizeKb)}</span>
          )}
          <span className="text-[11px] text-gray-300">{date}</span>
        </div>
      </div>

      {/* Action icon */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
        {isLink
          ? <FiExternalLink size={14} className="text-gray-400" />
          : <FiDownload     size={14} className="text-gray-400" />
        }
      </div>
    </button>
  )
}

// ── Groupe par cours ────────────────────────────────────────────
function CourseGroup({ courseCode, courseName, semester, resources }: {
  courseCode: string
  courseName: string
  semester: number
  resources: CourseResource[]
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* En-tête cours */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-nc-navy">{courseName}</p>
            <span className="text-xs text-gray-400 font-mono">{courseCode}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Semestre {semester} · {resources.length} ressource{resources.length > 1 ? 's' : ''}
          </p>
        </div>
        <FiChevronDown
          size={15}
          className={clsx('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Liste ressources */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {resources.map((r) => (
            <ResourceItem key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pill filtre type ────────────────────────────────────────────
const TYPE_OPTIONS: Array<{ value: ResourceType | 'all'; label: string }> = [
  { value: 'all',   label: 'Tous'    },
  { value: 'pdf',   label: 'PDF'     },
  { value: 'video', label: 'Vidéos'  },
  { value: 'link',  label: 'Liens'   },
  { value: 'other', label: 'Autres'  },
]

// ── Page principale ─────────────────────────────────────────────
export default function ResourcesPage() {
  const { isLoading: authLoading } = useRequireAuth()
  const {
    courseGroups,
    availableSemesters,
    semesterFilter, setSemesterFilter,
    typeFilter,     setTypeFilter,
    search,         setSearch,
    totalResources,
    allResources,
    isLoading,
    error,
  } = useResources()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  // Compteurs par type sur toutes les ressources (pas filtrées)
  const typeCounts: Record<ResourceType, number> = {
    pdf:   allResources.filter((r) => r.type === 'pdf').length,
    video: allResources.filter((r) => r.type === 'video').length,
    link:  allResources.filter((r) => r.type === 'link').length,
    other: allResources.filter((r) => r.type === 'other').length,
  }

  return (
    <AppShell>
      <div className="space-y-4">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Ressources</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {totalResources} ressource{totalResources > 1 ? 's' : ''}
              {semesterFilter !== 'all' ? ` · Semestre ${semesterFilter}` : ''}
              {typeFilter !== 'all' ? ` · ${RESOURCE_META[typeFilter as ResourceType]?.label}` : ''}
            </p>
          </div>

          {/* Compteurs rapides */}
          {!isLoading && allResources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.entries(typeCounts) as Array<[ResourceType, number]>)
                .filter(([, n]) => n > 0)
                .map(([type, n]) => {
                  const meta = RESOURCE_META[type]
                  return (
                    <span
                      key={type}
                      className={clsx(
                        'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
                        meta.bg, meta.text
                      )}
                    >
                      <ResourceIcon type={type} size={11} />
                      {n} {meta.label}
                    </span>
                  )
                })}
            </div>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une ressource…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-nc-cyan focus:outline-none focus:ring-1 focus:ring-nc-cyan/30 transition"
          />
        </div>

        {/* Filtres type */}
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_OPTIONS.map(({ value, label }) => {
            const count = value === 'all' ? allResources.length : typeCounts[value as ResourceType]
            if (value !== 'all' && count === 0) return null
            return (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  typeFilter === value
                    ? 'bg-nc-navy text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {label}
                {count > 0 && (
                  <span className={clsx(
                    'ml-1.5 text-[10px]',
                    typeFilter === value ? 'opacity-70' : 'text-gray-400'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filtre semestres */}
        {availableSemesters.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSemesterFilter('all')}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                semesterFilter === 'all'
                  ? 'bg-nc-cyan text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              Tous semestres
            </button>
            {availableSemesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setSemesterFilter(sem)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  semesterFilter === sem
                    ? 'bg-nc-cyan text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                S{sem}
              </button>
            ))}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="h-14 animate-pulse bg-gray-50 border-b border-gray-100" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-12 animate-pulse bg-white border-b border-gray-50" />
                ))}
              </div>
            ))}
          </div>
        ) : courseGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100">
            <FiInbox size={40} className="text-gray-200 mb-4" />
            {search || typeFilter !== 'all' ? (
              <>
                <p className="text-sm font-medium text-gray-400">Aucun résultat</p>
                <p className="mt-1 text-xs text-gray-300">
                  Essayez d&apos;autres filtres ou termes de recherche.
                </p>
                <button
                  onClick={() => { setSearch(''); setTypeFilter('all'); setSemesterFilter('all') }}
                  className="mt-3 text-xs text-nc-cyan hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-400">Aucune ressource disponible</p>
                <p className="mt-1 text-xs text-gray-300">
                  Les supports de cours publiés par vos enseignants apparaîtront ici.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {courseGroups.map((g) => (
              <CourseGroup
                key={g.courseId}
                courseCode={g.courseCode}
                courseName={g.courseName}
                semester={g.semester}
                resources={g.resources}
              />
            ))}
          </div>
        )}

      </div>
    </AppShell>
  )
}
