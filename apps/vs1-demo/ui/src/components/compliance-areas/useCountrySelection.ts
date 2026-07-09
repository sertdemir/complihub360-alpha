import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CountryCode } from './types';

const STORAGE_KEY = 'complihub360.compliance.country';
const VALID_CODES: CountryCode[] = ['EU', 'DE', 'FR', 'IT', 'ES', 'UK', 'US', 'CH', 'ALL'];

function isValid(code: string | null | undefined): code is CountryCode {
  return !!code && (VALID_CODES as string[]).includes(code);
}

export function useCountrySelection(): [CountryCode, (next: CountryCode) => void] {
  const [params, setParams] = useSearchParams();

  const initial: CountryCode = (() => {
    const fromUrl = params.get('country');
    if (isValid(fromUrl)) return fromUrl;
    if (typeof window !== 'undefined') {
      const fromStorage = window.sessionStorage.getItem(STORAGE_KEY);
      if (isValid(fromStorage)) return fromStorage;
    }
    return 'EU';
  })();

  const [country, setCountryState] = useState<CountryCode>(initial);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, country);
    }
  }, [country]);

  const setCountry = useCallback(
    (next: CountryCode) => {
      setCountryState(next);
      const nextParams = new URLSearchParams(params);
      if (next === 'EU') {
        nextParams.delete('country');
      } else {
        nextParams.set('country', next);
      }
      setParams(nextParams, { replace: true });
    },
    [params, setParams],
  );

  return [country, setCountry];
}
