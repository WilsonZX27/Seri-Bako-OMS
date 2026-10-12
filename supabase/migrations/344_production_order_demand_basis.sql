-- Explicit on-order products do not create recurring daily production demand.
alter table public.production_batch_rules drop constraint production_batch_rules_forecast_basis_check;
alter table public.production_batch_rules add constraint production_batch_rules_forecast_basis_check check(forecast_basis in ('same_day','manual','on_order'));
