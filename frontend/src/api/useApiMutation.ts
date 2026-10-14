import { useMutation, useQueryClient } from "@tanstack/react-query";

//every write in the app does the same thing: call the api, then refetch everything on screen
//(totals show up on several pages, so invalidating all queries is simpler and safer than picking keys)
export function useApiMutation<Vars = void>(request: (vars: Vars) => Promise<unknown>, onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      queryClient.invalidateQueries();
      onDone?.();
    },
  });
}
