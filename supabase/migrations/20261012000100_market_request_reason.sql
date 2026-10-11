-- ─── Marktanfragen: wofuer die Anfrage steht ─────────────────────────────────
--
-- `market_requests` traegt seit EN-Launch Schritt 2 (Canvas C2, "Request More
-- Coverage") zwei Arten Anfragen in derselben Zeile je Anfragendem und Markt:
--
--   'market'            Die Engine prueft den Markt noch nicht ("Request This
--                       Market", Zustand marketUnavailable). Das Update kommt,
--                       sobald das Land in die Engine kommt.
--   'provider_coverage' Die Engine prueft den Markt, aber kein freigegebener
--                       Anbieter deckt die genannten `domains` dort ab. Das
--                       Update kommt, sobald `matchable_provider_services` dort
--                       fuer einen dieser Bereiche eine Zeile hat.
--
-- Bis hierhin war das nur aus `isKnownCountry(market)` zur Laufzeit ableitbar
-- — und der Versand haette eine Abdeckungs-Anfrage fuer einen bekannten Markt
-- sofort als "Markt abgedeckt" beantwortet. Die Spalte macht die Frage, auf
-- die die Mail antwortet, zu einem Teil der Zeile.
--
-- Bestehende Zeilen bleiben 'market' (DEFAULT): vor dieser Migration konnte
-- eine Abdeckungs-Anfrage kein Update bestellen (`notify` war erzwungen
-- false), also verspricht keine Altzeile eine Abdeckungs-Mail.
--
-- Weiterhin KEINE E-Mail-Adresse: auch dieses Update liest sie erst beim
-- Versand aus auth.users (auth_user_email_by_id, 20261001184141).

ALTER TABLE public.market_requests
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'market';

ALTER TABLE public.market_requests
  DROP CONSTRAINT IF EXISTS market_requests_reason_known;
ALTER TABLE public.market_requests
  ADD CONSTRAINT market_requests_reason_known
    CHECK (reason IN ('market', 'provider_coverage'));

-- Eine Abdeckungs-Anfrage ohne Bereich sagt nicht, was fehlt — die API
-- lehnt sie ab (409 MARKET_COVERED), die Datenbank auch.
ALTER TABLE public.market_requests
  DROP CONSTRAINT IF EXISTS market_requests_coverage_needs_domains;
ALTER TABLE public.market_requests
  ADD CONSTRAINT market_requests_coverage_needs_domains
    CHECK (reason <> 'provider_coverage' OR cardinality(domains) > 0);

COMMENT ON COLUMN public.market_requests.reason IS
  'market = Land noch nicht in der Engine; provider_coverage = Land geprueft, aber kein freigegebener Anbieter fuer die genannten domains. Bestimmt, wann der Watcher das (einmalige) Update verschickt.';
