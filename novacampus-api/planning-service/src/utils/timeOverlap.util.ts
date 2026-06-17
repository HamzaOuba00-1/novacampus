/**
 * utils/timeOverlap.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour détecter les chevauchements horaires.
 *
 * Utilisées par le conflict detector pour vérifier si deux créneaux
 * se chevauchent dans la même salle au même jour.
 *
 * Format des horaires : "HH:MM" (ex : "08:30", "10:00")
 * ---------------------------------------------------------------
 */

/**
 * Convertit une heure au format "HH:MM" en nombre de minutes
 * depuis minuit pour faciliter les comparaisons numériques.
 *
 * @param time - Heure au format "HH:MM"
 * @returns Nombre de minutes depuis minuit
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Vérifie si deux plages horaires se chevauchent.
 * Deux plages se chevauchent si et seulement si :
 *   début1 < fin2  ET  début2 < fin1
 *
 * Les plages qui se touchent exactement (fin1 = début2) ne
 * sont PAS considérées comme un chevauchement.
 *
 * @param start1 - Début du premier créneau "HH:MM"
 * @param end1   - Fin du premier créneau "HH:MM"
 * @param start2 - Début du second créneau "HH:MM"
 * @param end2   - Fin du second créneau "HH:MM"
 * @returns true si les deux plages se chevauchent
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/**
 * Valide que l'heure de début est strictement antérieure à la fin.
 *
 * @param startTime - Heure de début "HH:MM"
 * @param endTime   - Heure de fin "HH:MM"
 * @returns true si l'horaire est cohérent
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) < timeToMinutes(endTime);
}

/**
 * Formate un numéro de jour (0-6) en libellé français.
 */
export function dayOfWeekLabel(day: number): string {
  const labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  return labels[day] ?? 'Inconnu';
}
