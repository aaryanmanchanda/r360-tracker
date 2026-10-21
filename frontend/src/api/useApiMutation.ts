import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/useToast";

interface Options<Vars, Result> {
  onDone?: () => void; //e.g. clear the form
  success?: (result: Result, vars: Vars) => string; //the toast text, so an action never finishes silently
}

//every write in the app does the same thing: call the api, then refetch everything on screen
//(totals show up on several pages, so invalidating all queries is simpler and safer than picking keys)
export function useApiMutation<Vars = void, Result = unknown>(
  request: (vars: Vars) => Promise<Result>,
  { onDone, success }: Options<Vars, Result> = {},
) {
  const queryClient = useQueryClient();
  const notify = useToast();
  return useMutation({
    mutationFn: request,
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries();
      onDone?.();
      if (success) notify(success(result, vars));
    },
  });
}
