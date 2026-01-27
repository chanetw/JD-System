-- Seed 2026 Holidays
INSERT INTO holidays (tenant_id, name, date, type, is_recurring)
SELECT 
    1 as tenant_id,
    name, 
    date::DATE, 
    type, 
    is_recurring
FROM (VALUES 
    ('วันขึ้นปีใหม่ (New Years Day)', '2026-01-01', 'government', true),
    ('วันหยุดชดเชยวันสิ้นปี (New Years Eve Substitution)', '2026-01-02', 'government', false),
    ('วันมาฆบูชา (Makha Bucha Day)', '2026-03-03', 'government', false),
    ('วันจักรี (Chakri Memorial Day)', '2026-04-06', 'government', true),
    ('วันสงกรานต์ (Songkran Festival)', '2026-04-13', 'government', true),
    ('วันสงกรานต์ (Songkran Festival)', '2026-04-14', 'government', true),
    ('วันสงกรานต์ (Songkran Festival)', '2026-04-15', 'government', true),
    ('วันแรงงานแห่งชาติ (National Labour Day)', '2026-05-01', 'company', true),
    ('วันฉัตรมงคล (Coronation Day)', '2026-05-04', 'government', true),
    ('วันพืชมงคล (Royal Ploughing Ceremony)', '2026-05-11', 'government', false), -- Tentative
    ('วันวิสาขบูชา (Visakha Bucha Day)', '2026-05-31', 'government', false),
    ('วันหยุดชดเชยวันวิสาขบูชา (Substitution for Visakha Bucha)', '2026-06-01', 'government', false),
    ('วันเฉลิมพระชนมพรรษาพระราชินี (H.M. Queen Suthidas Birthday)', '2026-06-03', 'government', true),
    ('วันเฉลิมพระชนมพรรษา ร.10 (H.M. King Maha Vajiralongkorns Birthday)', '2026-07-28', 'government', true),
    ('วันอาสาฬหบูชา (Asalha Bucha Day)', '2026-07-29', 'government', false),
    ('วันเข้าพรรษา (Buddhist Lent Day)', '2026-07-30', 'government', false),
    ('วันเฉลิมพระชนมพรรษาพระพันปีหลวง (H.M. Queen Sirikit The Queen Mothers Birthday)', '2026-08-12', 'government', true),
    ('วันคล้ายวันสวรรคต ร.9 (H.M. King Bhumibol Adulyadej The Great Memorial Day)', '2026-10-13', 'government', true),
    ('วันปิยมหาราช (Chulalongkorn Day)', '2026-10-23', 'government', true),
    ('วันชาติและวันพ่อแห่งชาติ (H.M. King Bhumibol Adulyadejs Birthday)', '2026-12-05', 'government', true),
    ('วันหยุดชดเชยวันพ่อแห่งชาติ (Substitution for National Day)', '2026-12-07', 'government', false),
    ('วันรัฐธรรมนูญ (Constitution Day)', '2026-12-10', 'government', true),
    ('วันสิ้นปี (New Years Eve)', '2026-12-31', 'government', true)
) AS v(name, date, type, is_recurring)
WHERE NOT EXISTS (
    SELECT 1 FROM holidays h WHERE h.date = v.date::DATE AND h.tenant_id = 1
);
