-- Landline/voice faults were being misclassified as broadband_fault because no
-- category fit them. Add a dedicated category.

alter table tickets drop constraint tickets_category_check;

alter table tickets add constraint tickets_category_check check (category in (
  'broadband_fault', 'mobile_fault', 'landline_fault', 'billing', 'provisioning', 'account', 'complaint', 'other'
));
