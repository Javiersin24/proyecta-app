import { createContext, useContext, useState, useCallback } from 'react';
import { get, post } from './api.js';

const ProjectingContext = createContext(null);

export function ProjectingProvider({ children }) {
  const [session, setSession] = useState(null); // { projectorId, projectorName, fileName }

  const listProjectors = useCallback(() => get('/projector').then((d) => d.projectors), []);

  const start = useCallback(async (projector, fileName, classId) => {
    await post(`/projector/${projector.id}/project`, { fileName, classId });
    setSession({ projectorId: projector.id, projectorName: projector.name, fileName });
  }, []);

  const stop = useCallback(async () => {
    if (session) await post(`/projector/${session.projectorId}/stop`).catch(() => {});
    setSession(null);
  }, [session]);

  return (
    <ProjectingContext.Provider value={{ session, listProjectors, start, stop }}>
      {children}
    </ProjectingContext.Provider>
  );
}

export const useProjecting = () => useContext(ProjectingContext);
