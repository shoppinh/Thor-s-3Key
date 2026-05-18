import {
  unstable_usePrompt as usePrompt,
  useBeforeUnload
} from '@remix-run/react';
import { useCallback } from 'react';

function useNavigationGuard(enabled: boolean, message: string) {
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!enabled) return;

        event.preventDefault();
        event.returnValue = message;
      },
      [enabled, message]
    )
  );

  usePrompt({
    when: enabled,
    message
  });
}

export default useNavigationGuard;
