--
-- Data Management Language
-- Queries for retrieval of information
--

-- 
--
-- PATIENTS 
-- 

-- Insert patient

INSERT INTO 
  patient (
    institution_id, 
    department, 
    disease_id, 
    geofence_id, 
    age_range, 
    gender, 
    registered_at,
    enabled
  )
VALUES
  (
    INSTITUTION_ID, -- NN INTEGER obtained from job data
    DEPARTMENT_ID, -- NN INTEGER obtained from job data
    DISEASE_ID, -- NN INTEGER obtained from register data
    GEOFENCE_ID, -- NN INTEGER obtained from anonimization in job
    AGE_RANGE, -- NN INTEGER obtained from anonimization in job  
    GENDER, -- NN STRING (H / M) obtained from anonimization in job  
    REGISTERED_AT, -- NN STRING obtained from register data  
    TRUE -- BOOLEAN by default
  );

-- 
--
-- CITY
-- 

-- Get all cities

SELECT 
  id, 
  "name", 
  description, 
  geofence_id, 
  created_at, 
  updated_at, 
  enabled
FROM 
  city
WHERE
  enabled = TRUE;


-- 
--
-- INSTITUTIONS
-- 

-- Get all institutions

SELECT 
  id, 
  city_id, 
  "name", 
  description, 
  created_at, 
  updated_at, 
  enabled, 
  "location"
FROM 
  institution
WHERE 
  enabled = TRUE;

-- Get institutions by name search
SELECT 
  id, 
  city_id, 
  "name", 
  description, 
  created_at, 
  updated_at, 
  enabled, 
  "location"
FROM 
  institution
WHERE 
  enabled = TRUE AND 
  "name" LIKE '%?%'


-- 
--
-- DEPARTMENT
-- 

-- Get all departments from institution
SELECT 
  id, 
  institution, 
  city_id, 
  "name", 
  description, 
  created_at, 
  updated_at, 
  enabled
FROM 
  department
WHERE
  institution = INSTITUTION_ID AND
  enabled = TRUE;


-- 
--
-- PATIENT AGES
-- 

-- Get all age ranges (/age)

SELECT 
  id, 
  "name", 
  description, 
  start_age, 
  end_age, 
  privacy_level, 
  created_at, 
  updated_at
FROM 
  patient_age
WHERE
  privacy_level <= USER_PRIVACY_LEVEL;


-- 
--
-- GEOFENCES
-- 

-- Get all geofences from a city and a granularity level (/geozones)
SELECT 
  id, 
  "name", 
  description, 
  polygon, 
  parent_geofence_id, 
  granularity_level,
  city_id,
  population
FROM 
  geofence
WHERE 
  city_id = SEARCH_CITY_ID AND
  granularity_level = GRANULARITY_LEVEL;

-- Get one geofence (/geozones/{id}/info)
SELECT 
  id, 
  "name", 
  description, 
  polygon, 
  parent_geofence_id, 
  granularity_level,
  city_id,
  geo_tag, 
  population, 
  created_at, 
  updated_at
FROM 
  geofence
WHERE 
  id = GEOFENCE_ID;


-- 
--
-- DISEASES
-- 

-- Get deseases by keyword (/deseases)
SELECT 
  id, 
  cie10_code, 
  description, 
  "name", 
  privacy_level,
  enabled
FROM 
  disease
WHERE 
  enable = TRUE AND
  privacy_level <= USER_PRIVACY_LEVEL AND
  "name" LIKE USER_QUERY;

-- 
--
-- DESEASES AGREGGATION
-- 

-- Get aggregations by keyword (/deseases)
SELECT 
  id, 
  privacy_level, 
  aggregation_type, 
  "name", 
  description, 
  geo_tag, 
  enabled
FROM 
  aggregation
WHERE 
  enabled = TRUE AND
  privacy_level <= USER_PRIVACY_LEVEL AND
  "name" LIKE USER_QUERY;


-- 
--
-- GEOFENCES GROUPS
-- 

-- Get all geofences groups
SELECT 
  id, 
  privacy_level, 
  "name", 
  description, 
  created_by
FROM geofence_group
WHERE 
  privacy_level <= USER_PRIVACY_LEVEL AND
  "name" LIKE USER_QUERY;

-- Get geofences groups by name query
SELECT 
  id, 
  privacy_level, 
  "name", 
  description, 
  created_by, 
FROM geofence_group
WHERE 
  privacy_level <= USER_PRIVACY_LEVEL AND
  "name" LIKE USER_QUERY;

-- Get list of geofences groups polygons
SELECT 
  pg.id, 
  pg.privacy_level AS group_privacy_level, 
  pg."name" AS group_name, 
  pg.description AS group_description, 
  pg.created_by, 
  g.polygon AS geofence_polygon,
  g.name AS geofence_name,
  g.description AS geofence_description,
  g.granularity_level AS geofence_granularity_level,
  g.parent_geofence_id AS geofence_parent_id,
  g.population AS geofence_population,
  g.city_id
FROM 
  geofence_group pg 
  LEFT JOIN geofences_groups gg ON pg.id = gg.group_id
  LEFT JOIN geofence g ON gg.group_id = g.id
WHERE 
  g.city_id = SEARCH_CITY_ID AND
  g.granularity_level = GRANULARITY_LEVEL AND
  pg.privacy_level <= USER_PRIVACY_LEVEL AND
  pg.id IN (SELECTED_USER_geofences_groups_LIST);

-- Insert new geofence group

-- First insert the polygon group
INSERT INTO 
  geofence_group (
    privacy_level, 
    "name", 
    description, 
    created_by
  )
VALUES(
  USER_PRIVACY_LEVEL, 
  ENTERED_NAME, 
  ENTERED_DESCRIPTION, 
  USER_ID_CREATING_THE_GEOFENCE
);

-- Then insert EACH relationship on geofences_groups
INSERT INTO geofences_groups (
  group_id, 
  geofence_id
)
VALUES(
  CREATED_GROUP_ID, 
  GEOFENCE_ID -- repeat changing this
);


-- 
--
-- INCIDENCES
-- 

-- Main query for getting incidences of all patients

SELECT 
  geo.polygon,
  geo.name,
  geo.population,
  COUNT(p.id) AS "absolute",
  (COUNT(p.id) * 100) / population::decimal AS relative_to_population,
  1000 * (COUNT(p.id) * 100) / population::decimal AS every_1000_inhabitants,
  CAST(COUNT(p.id) AS DECIMAL) / (
    SELECT 
      COUNT(p.id) 
    FROM 
      patient p2
    WHERE 
      geo.id = p2.geofence_id 
    GROUP BY 
      p2.geofence_id 
  ) AS relative_to_patients
FROM 
  geofence geo LEFT JOIN patient p ON p.geofence_id = geo.id
WHERE 
  geo.granularity_level = SELECTED_GRANULARITY_LEVEL AND
  geo.city_id = SELECTED_CITY_ID AND
  p.city_id = SELECTED_CITY_ID AND
  p.intitution_id = SELECTED_INSTITUTION_ID AND
  p.department_id = SELECTED_DEPARTMENT_ID AND -- if given
  p.age_range = SELECTED_AGE_RANGE_ID AND -- if given
  p.gender = SELECTED_GENDER AND -- if given
  p.enabled = TRUE AND
  p.registered_at BETWEEN STARTING_DATE AND ENDING_DATE AND -- if given 
  p.geofence_id IN ( -- if geofence group is given
    SELECT 
      g.id
    FROM
      geofence_group pg 
      LEFT JOIN geofences_groups gg ON pg.id = gg.group_id 
      LEFT JOIN geofence g ON gg.geofence_id = g.id
    WHERE
      gg.id = SELECTED_GEOGROUP_ID  AND
      pg.privacy_level <= USER_PRIVACY_LEVEL
  ) AND
  p.disease_id IN ( -- if disease aggregation is given, else just 1 value
    SELECT
      d.id
    FROM
      disease d
      LEFT JOIN disease_aggregation da ON d.id = da.disease_id 
      LEFT JOIN aggregation a ON da.aggregation_id = a.id
    WHERE
      a.id = SELECTED_DISEASEAGGREGATION_ID AND
      d.privacy_level <= USER_PRIVACY_LEVEL
  )
GROUP BY
  p.geofence_id
;