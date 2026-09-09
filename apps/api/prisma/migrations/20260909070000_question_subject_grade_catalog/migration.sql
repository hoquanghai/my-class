-- Chuẩn hóa môn/khối của câu hỏi sang mã danh mục (packages/shared/src/education.ts), như đã làm với Class.
UPDATE "Question"
SET "subject" = CASE lower(trim("subject"))
  WHEN 'toán' THEN 'toan'
  WHEN 'toan' THEN 'toan'
  WHEN 'vật lý' THEN 'vat_ly'
  WHEN 'vật lí' THEN 'vat_ly'
  WHEN 'lý' THEN 'vat_ly'
  WHEN 'lí' THEN 'vat_ly'
  WHEN 'hóa học' THEN 'hoa_hoc'
  WHEN 'hóa' THEN 'hoa_hoc'
  WHEN 'sinh học' THEN 'sinh_hoc'
  WHEN 'sinh' THEN 'sinh_hoc'
  WHEN 'ngữ văn' THEN 'ngu_van'
  WHEN 'văn' THEN 'ngu_van'
  WHEN 'tiếng anh' THEN 'tieng_anh'
  WHEN 'anh văn' THEN 'tieng_anh'
  WHEN 'anh' THEN 'tieng_anh'
  WHEN 'lịch sử' THEN 'lich_su'
  WHEN 'sử' THEN 'lich_su'
  WHEN 'địa lý' THEN 'dia_ly'
  WHEN 'địa lí' THEN 'dia_ly'
  WHEN 'địa' THEN 'dia_ly'
  WHEN 'giáo dục kinh tế và pháp luật' THEN 'gdkt_pl'
  WHEN 'gdkt&pl' THEN 'gdkt_pl'
  WHEN 'gdcd' THEN 'gdkt_pl'
  WHEN 'tin học' THEN 'tin_hoc'
  WHEN 'tin' THEN 'tin_hoc'
  ELSE 'khac'
END
WHERE "subject" IS NOT NULL
  AND "subject" NOT IN ('toan','vat_ly','hoa_hoc','sinh_hoc','ngu_van','tieng_anh','lich_su','dia_ly','gdkt_pl','tin_hoc','khac');

UPDATE "Question"
SET "grade" = substring("grade" from '(1[0-2]|[6-9])')
WHERE "grade" IS NOT NULL
  AND "grade" !~ '^(1[0-2]|[6-9])$';
