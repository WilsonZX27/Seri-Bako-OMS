# Management email notifications

The daily digest is limited to active Owner (`super_admin`), Manager, and People Operations accounts. It includes pending documents, submitted outlet schedules, and outlet compliance records expiring within 30 days. Outlet Staff and Outlet Supervisors are never recipients. The email contains only a short summary and a dashboard link; compliance attachments and sensitive fields are excluded.

At 01:00 UTC (09:00 Malaysia time), Vercel calls `/api/cron/management-email`. The route requires `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` and `RESEND_API_KEY` in the Vercel project, verify `seribako.com.my` as a sending domain with the provider, then apply migration `315_management_email_dispatches.sql` before enabling the cron. The sender is fixed to `Seri Bako Operations <admin@seribako.com.my>`.

The database log claims one digest per recipient per Malaysia calendar day before delivery, and Resend receives the same idempotency key. Failed claims remain visible for investigation and are not retried automatically to avoid duplicate emails after provider timeouts. A missing secret or API key fails closed and sends nothing. Check `management_email_dispatches` for `failed` rows and the cron response for delivery counts.
