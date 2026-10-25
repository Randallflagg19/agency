\set ON_ERROR_STOP on
\encoding UTF8

-- Снимок cases.mock.ts: 6 дел, 4 направленные связи, 0 тегов.
-- Повторяемое заполнение, не структурная миграция.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'agency_db' THEN
    RAISE EXCEPTION 'Seed requires database agency_db';
  END IF;
END
$$;
SET LOCAL ROLE agency_owner;

-- Блокирует конкурирующие записи на время проверки и вставки; чтение доступно.
LOCK TABLE agency.cases, agency.case_tags, agency.case_relations
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE agency_seed_cases ON COMMIT DROP AS
SELECT * FROM jsonb_populate_recordset(NULL::agency.cases,
$agency_seed$[
  {
    "id": "case-0147",
    "number": "0147",
    "title": "Голос из закрытого лифта",
    "description": "В административном здании на проспекте Металлургов сотрудники несколько раз слышали мужской голос из кабины грузового лифта, находившегося между этажами.\n\nГолос произносил короткие фразы и называл сотрудников по имени. В момент каждого эпизода питание лифта было отключено, а кабина оставалась пустой.\n\nНа одной из аудиозаписей зафиксирована фраза, совпадающая с частью записи из дела CASE-0211.",
    "status": "investigating",
    "category": "acoustic",
    "threat_level": 3,
    "location_region": "Кемеровская область — Кузбасс",
    "location_description": "Служебный лифт административного здания, центральная часть Новокузнецка",
    "location_address": null,
    "assignee_id": "employee-001",
    "registered_at": "2026-02-18T22:14:00+07:00",
    "cover_image_url": "/assets/cases/case-0147-elevator.png",
    "conclusion": null
  },
  {
    "id": "case-0032",
    "number": "0032",
    "title": "Свет в пустом доме",
    "description": "Жители небольшого посёлка несколько ночей подряд наблюдали свет в окне дома, который не используется более десяти лет.\n\nЭлектричество к зданию официально отключено. При осмотре внутри не обнаружено работающих источников света, следов проникновения или временного проживания.\n\nНа фотографии, сделанной одним из очевидцев, свет виден только в одном окне второго этажа.",
    "status": "new",
    "category": "visual",
    "threat_level": null,
    "location_region": "Томская область",
    "location_description": "Заброшенный жилой дом на окраине посёлка",
    "location_address": null,
    "assignee_id": null,
    "registered_at": "2026-09-27T01:42:00+07:00",
    "cover_image_url": "/assets/cases/case-0032-empty-house.png",
    "conclusion": null
  },
  {
    "id": "case-0211",
    "number": "0211",
    "title": "Звонок с отключённой линии",
    "description": "В архивном помещении Бюро несколько раз звонил стационарный телефон, отключённый от городской сети.\n\nПри снятии трубки оператор слышал шум линии и мужской голос, называвший дату и время следующего звонка.\n\nПоследние три предсказанных звонка произошли с точностью до минуты.\n\nФрагмент голоса имеет сходные характеристики с аудиозаписью из CASE-0147.",
    "status": "closed",
    "category": "telecommunication",
    "threat_level": 2,
    "location_region": "Москва",
    "location_description": "Старое архивное помещение Бюро",
    "location_address": null,
    "assignee_id": "employee-003",
    "registered_at": "2025-11-04T03:17:00+03:00",
    "cover_image_url": "/assets/cases/case-0211-telephone-desk.png",
    "conclusion": "После переноса телефонного аппарата в экранированное хранилище новые звонки не зарегистрированы в течение 120 суток. Источник сигнала установить не удалось. Дело переведено в закрытый архив с возможностью повторного открытия."
  },
  {
    "id": "case-0098",
    "number": "0098",
    "title": "Тропа, которой нет на карте",
    "description": "Группа лесников сообщила о тропе, периодически появляющейся в участке хвойного леса после сильного тумана.\n\nТропа отсутствует на картах и спутниковых снимках. Попытки пройти её до конца приводили наблюдателей обратно к исходной точке, хотя по показаниям навигационных приборов они двигались преимущественно в одном направлении.\n\nВо время третьего обследования один из участников отсутствовал 47 минут, хотя остальные утверждают, что не теряли его из виду более нескольких секунд.",
    "status": "investigating",
    "category": "spatial",
    "threat_level": 4,
    "location_region": "Пермский край",
    "location_description": "Лесной массив примерно в 18 км от ближайшего населённого пункта",
    "location_address": null,
    "assignee_id": "employee-002",
    "registered_at": "2026-06-13T05:26:00+05:00",
    "cover_image_url": "/assets/cases/case-0098-forest-trail.png",
    "conclusion": null
  },
  {
    "id": "case-0176",
    "number": "0176",
    "title": "Фотография здания без адреса",
    "description": "При разборе старого ведомственного архива обнаружена фотография крупного административного здания.\n\nНа обороте указан 1974 год, но отсутствуют адрес, название учреждения и имя фотографа.\n\nАрхитектурный отдел не смог идентифицировать здание. При увеличении фотографии в одном из окон видна табличка с номером дела `0098`, хотя само дело было зарегистрировано значительно позже.\n\nПроисхождение фотографии остаётся неизвестным.",
    "status": "suspended",
    "category": "visual",
    "threat_level": null,
    "location_region": null,
    "location_description": "Местоположение изображённого здания не установлено",
    "location_address": null,
    "assignee_id": null,
    "registered_at": "2026-07-02T14:08:00+03:00",
    "cover_image_url": "/assets/cases/case-0176-old-building-photo.png",
    "conclusion": null
  },
  {
    "id": "case-0203",
    "number": "0203",
    "title": "Коридор под архивом",
    "description": "Во время ремонта подвального помещения рабочие обнаружили металлическую дверь за фальшивой стеной.\n\nЗа дверью находится технический коридор, которого нет ни на одном из сохранившихся планов здания.\n\nДлина коридора по лазерному дальномеру составляет около 63 метров. Однако внешние размеры здания не позволяют разместить внутри него помещение такой длины.\n\nПервичное обследование остановлено после отказа двух независимых приборов навигации.",
    "status": "new",
    "category": "spatial",
    "threat_level": null,
    "location_region": "Ленинградская область",
    "location_description": "Подвальный уровень старого ведомственного архива",
    "location_address": null,
    "assignee_id": null,
    "registered_at": "2026-10-06T19:31:00+03:00",
    "cover_image_url": "/assets/cases/case-0203-underground-tunnel.png",
    "conclusion": null
  }
]$agency_seed$::jsonb);

CREATE TEMP TABLE agency_seed_relations ON COMMIT DROP AS
SELECT * FROM jsonb_populate_recordset(NULL::agency.case_relations,
$agency_seed$[
  {
    "case_id": "case-0147",
    "related_case_id": "case-0211",
    "position": 0
  },
  {
    "case_id": "case-0211",
    "related_case_id": "case-0147",
    "position": 0
  },
  {
    "case_id": "case-0098",
    "related_case_id": "case-0176",
    "position": 0
  },
  {
    "case_id": "case-0176",
    "related_case_id": "case-0098",
    "position": 0
  }
]$agency_seed$::jsonb);

-- Если уже существующее дело отличается от снимка, ничего не перезаписываем.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM agency.cases c
    JOIN agency_seed_cases s ON s.id = c.id
    WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(s)
  ) THEN
    RAISE EXCEPTION 'Existing seed case differs from snapshot; no changes applied';
  END IF;

  -- В этом снимке теги пусты у всех шести дел.
  IF EXISTS (
    SELECT 1 FROM agency.case_tags t
    JOIN agency_seed_cases s ON s.id = t.case_id
  ) THEN
    RAISE EXCEPTION 'Existing seed case has tags; no changes applied';
  END IF;

  IF EXISTS (
    SELECT r.* FROM agency.case_relations r
    JOIN agency_seed_cases s ON s.id = r.case_id
    EXCEPT
    SELECT r.* FROM agency_seed_relations r
    JOIN agency.cases c ON c.id = r.case_id
  ) OR EXISTS (
    SELECT r.* FROM agency_seed_relations r
    JOIN agency.cases c ON c.id = r.case_id
    EXCEPT
    SELECT r.* FROM agency.case_relations r
    JOIN agency_seed_cases s ON s.id = r.case_id
  ) THEN
    RAISE EXCEPTION 'Existing seed relations differ from snapshot; no changes applied';
  END IF;
END
$$;

CREATE TEMP TABLE agency_seed_new_ids ON COMMIT DROP AS
SELECT s.id FROM agency_seed_cases s
WHERE NOT EXISTS (SELECT 1 FROM agency.cases c WHERE c.id = s.id);

-- Конфликт уникального номера с посторонним делом также откатит транзакцию.
INSERT INTO agency.cases
SELECT s.* FROM agency_seed_cases s
JOIN agency_seed_new_ids n ON n.id = s.id;

INSERT INTO agency.case_relations
SELECT r.* FROM agency_seed_relations r
JOIN agency_seed_new_ids n ON n.id = r.case_id;

SELECT count(*) AS inserted_cases FROM agency_seed_new_ids;

COMMIT;
