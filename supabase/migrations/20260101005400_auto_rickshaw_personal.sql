-- =====================================================================
-- Duleko MVP :: 5400 :: Auto Rickshaw under Personal & Everyday Services
-- =====================================================================
-- Migration 3200 put it under Trades & Local Services; the team wants it
-- with the everyday services (tracker item #40). Placed right after
-- Delivery (350). Nothing else changes: the skill keeps its id, so every
-- profile that already lists it is untouched. Safe to run more than once.

update public.skills
   set category   = 'personal',
       sort_order = 355
 where id = 'auto_rickshaw';
