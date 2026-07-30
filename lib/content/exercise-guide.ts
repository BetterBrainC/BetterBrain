/**
 * Home-exercise guide shown in the relatives portal ("วิธีออกกำลังกาย").
 *
 * Content is owned entirely by staff: Director/Admin manage it per โปรแกรมฝึก
 * on /staff/relatives, stored in `settings.extra.exercise_guides`. There is no
 * built-in fallback list — clinical advice must not be authored by the app
 * (client 30 ก.ค. 2569), so when staff have not written anything the portal
 * simply hides the section.
 */
export interface ExerciseGuideItem {
  title: string;
  detail: string;
}

/** Coerce a raw jsonb value into a clean list of {title, detail} (title required). */
export function parseExerciseItems(value: unknown): ExerciseGuideItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { title: string; detail?: unknown } =>
        !!e && typeof e === "object" && typeof (e as { title?: unknown }).title === "string" &&
        (e as { title: string }).title.trim().length > 0,
    )
    .map((e) => ({
      title: (e as { title: string }).title.trim(),
      detail: String((e as { detail?: unknown }).detail ?? "").trim(),
    }));
}
