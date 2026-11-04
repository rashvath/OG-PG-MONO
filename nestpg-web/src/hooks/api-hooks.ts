import { useCallback, useEffect, useMemo, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string
}

type MutationState<T> = AsyncState<T> & {
  execute: (...args: unknown[]) => Promise<T>
  reset: () => void
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export function useApiGet<T>(fetcher: () => Promise<T>, deps: unknown[] = [], fallbackError = 'Unable to fetch data') {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: '',
  })

  const execute = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: '' }))
    try {
      const data = await fetcher()
      setState({ data, loading: false, error: '' })
      return data
    } catch (error) {
      const message = toMessage(error, fallbackError)
      setState((previous) => ({ ...previous, loading: false, error: message }))
      throw error
    }
  }, [fetcher, fallbackError])

  useEffect(() => {
    execute().catch(() => {
      // Error state is already handled above.
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return useMemo(
    () => ({
      ...state,
      refetch: execute,
    }),
    [execute, state],
  )
}

function useApiMutation<T>(mutator: (...args: unknown[]) => Promise<T>, fallbackError = 'Request failed'): MutationState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: '',
  })

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState((previous) => ({ ...previous, loading: true, error: '' }))
      try {
        const data = await mutator(...args)
        setState({ data, loading: false, error: '' })
        return data
      } catch (error) {
        const message = toMessage(error, fallbackError)
        setState((previous) => ({ ...previous, loading: false, error: message }))
        throw error
      }
    },
    [fallbackError, mutator],
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: '' })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

export function useApiPost<T>(mutator: (...args: unknown[]) => Promise<T>, fallbackError = 'Unable to create data') {
  return useApiMutation(mutator, fallbackError)
}

export function useApiPut<T>(mutator: (...args: unknown[]) => Promise<T>, fallbackError = 'Unable to update data') {
  return useApiMutation(mutator, fallbackError)
}

export function useApiDelete<T>(mutator: (...args: unknown[]) => Promise<T>, fallbackError = 'Unable to delete data') {
  return useApiMutation(mutator, fallbackError)
}
