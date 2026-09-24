-- VOIP/digital voice line faults were being folded into landline_fault, but they're
-- a distinct issue (a digital line vs. a traditional analogue one) with different
-- troubleshooting steps. Add a dedicated category.

alter table tickets drop constraint tickets_category_check;

alter table tickets add constraint tickets_category_check check (category in (
  'broadband_fault', 'mobile_fault', 'landline_fault', 'voip_fault', 'billing', 'provisioning', 'account', 'complaint', 'other'
));
