import { useEffect, useState } from "react";

import {
  getNavigationSessionState,
  subscribeToNavigationSession,
  type NavigationSessionState,
} from "../services/navigation/navigationSession";

export function useNavigationSessionState(): NavigationSessionState {
  const [session, setSession] =
    useState<NavigationSessionState>(
      getNavigationSessionState()
    );

  useEffect(() => {
    setSession(
      getNavigationSessionState()
    );

    return subscribeToNavigationSession(
      setSession
    );
  }, []);

  return session;
}