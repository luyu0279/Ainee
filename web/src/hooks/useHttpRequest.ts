import { CustomOpenApi } from '@/apis';
import { BaseHttpRequest } from '@/apis/core/BaseHttpRequest';
import { useMemo } from 'react';

export function useHttpRequest(): BaseHttpRequest {
  return useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ainee_token') : null;
    
    return new CustomOpenApi({
      WITH_CREDENTIALS: true,
      CREDENTIALS: 'include',
      HEADERS: token ? {
        'Authorization': `Bearer ${token}`
      } : undefined
    }).request;
  }, []);
} 