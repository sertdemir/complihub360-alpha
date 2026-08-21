import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isCountryCode, type CountryCode } from './types';

const STORAGE_KEY = 'complihub360.compliance.country';

// The selection survives three things on purpose: a reload (sessionStorage), a
// shared link (?country=), and a move from the hub to an area page and back —
// the area pages read statutes, penalties and cadences per market, so losing
// the choice mid-journey would reset the one input the reader gave us.
export function useCountrySelection(): [CountryCode, (next: CountryCode) => void] {
  const [params, setParams] = useSearchParams();

  const initial: CountryCode = (() => {
    const fromUrl = params.get('country');
    if (isCountryCode(fromUrl)) return fromUrl;
    if (typeof window !== 'undefined') {
      const fromStorage = window.sessionStorage.getItem(STORAGE_KEY);
      if (isCountryCode(fromStorage)) return fromStorage;
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
