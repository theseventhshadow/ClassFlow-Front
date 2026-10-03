import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@context';
import { PortalData, User, directoryService, portalService } from '@services';

interface UsePortalDataResult {
  data: PortalData | null;
  loading: boolean;
  error: string | null;
  /** Pupilos del apoderado (vacío para un estudiante). */
  students: User[];
  selectedStudentId: string | null;
  selectStudent: (studentId: string) => void;
  refetch: () => void;
}

/**
 * Datos del portal de estudiante/apoderado. El estudiante ve sus propios datos;
 * el apoderado elige a cuál de sus pupilos ver.
 */
export function usePortalData(): UsePortalDataResult {
  const { user } = useAuth();
  const isGuardian = user?.rol === 'GUARDIAN';

  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Pupilos del apoderado; un estudiante se ve a sí mismo.
  useEffect(() => {
    if (!user) return;
    if (!isGuardian) {
      setStudents([]);
      setSelectedStudentId(user.id);
      return;
    }

    let cancelled = false;
    directoryService
      .getStudentsByGuardian(user.id)
      .then((pupils) => {
        if (cancelled) return;
        setStudents(pupils);
        setSelectedStudentId((current) => current ?? pupils[0]?.id ?? null);
        if (pupils.length === 0) {
          setLoading(false);
          setError('No tienes estudiantes asociados a tu cuenta.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError('No se pudieron cargar tus estudiantes.');
      });

    return () => {
      cancelled = true;
    };
  }, [user, isGuardian]);

  useEffect(() => {
    if (!user || !selectedStudentId) return;
    const student = isGuardian ? students.find((s) => s.id === selectedStudentId) : user;
    if (!student) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    portalService
      .getStudentData(student, user.id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los datos. Intenta nuevamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isGuardian, students, selectedStudentId, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    data,
    loading,
    error,
    students,
    selectedStudentId,
    selectStudent: setSelectedStudentId,
    refetch,
  };
}
