--
-- Data Definition Language
-- Queries for setting up the DB
--

-- SET client_encoding = 'UTF8';
-- SET standard_conforming_strings = on;
-- SET check_function_bodies = false;
-- SET xmloption = content;
-- SET client_min_messages = warning;
-- SET row_security = off;

-- CREATE DATABASE healthmap;
-- COMMENT ON DATABASE healthmap IS 'Guayaquil Health Map database';
CREATE SCHEMA IF NOT EXISTS healthmap;
CREATE extension postgis;

UPDATE pg_extension 
  SET extrelocatable = TRUE 
    WHERE extname = 'postgis';
 
ALTER EXTENSION postgis 
  SET SCHEMA healthmap;
 
ALTER EXTENSION postgis 
  UPDATE TO "2.5.2next";
 
ALTER EXTENSION postgis 
  UPDATE TO "2.5.2";

SET search_path TO healthmap;

CREATE TABLE aggregation (
    id SERIAL,
    privacy_level integer NOT NULL DEFAULT 0,
    aggregation_type integer NOT NULL,
    name VARCHAR(500) NOT NULL,
    description text,
    geo_tag integer,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_updated_at_agg ON aggregation USING btree (updated_at);
CREATE INDEX idx_pvt_level_agg ON aggregation USING btree (privacy_level);
CREATE INDEX idx_geo_tag_agg ON aggregation USING btree (geo_tag);
CREATE INDEX idx_enabled_agg ON aggregation USING btree (enabled);
CREATE INDEX idx_created_at_agg ON aggregation USING btree (created_at);
CREATE INDEX idx_agg_type_agg ON aggregation USING btree (aggregation_type);
CREATE UNIQUE INDEX idx_id_agg ON aggregation USING btree (id);

CREATE TABLE aggregation_type (
    id SERIAL,
    name VARCHAR(50) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_updated_at_agg_type ON aggregation_type USING btree (updated_at);
CREATE UNIQUE INDEX idx_id_agg_type ON aggregation_type USING btree (id);
CREATE INDEX idx_enabled_agg_type ON aggregation_type USING btree (enabled);
CREATE INDEX idx_created_at_agg_type ON aggregation_type USING btree (created_at);


CREATE TABLE city (
    id SERIAL,
    name VARCHAR(50) NOT NULL,
    description text,
    geofence_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_enabled_city ON city USING btree (enabled);
CREATE INDEX idx_created_at_city ON city USING btree (created_at);
CREATE INDEX idx_geofence_city ON city USING btree (geofence_id);
CREATE UNIQUE INDEX idx_id_city ON city USING btree (id);
CREATE INDEX idx_updated_at_city ON city USING btree (updated_at);


CREATE TABLE department (
    id SERIAL,
    institution_id integer NOT NULL,
    city_id integer NOT NULL,
    name VARCHAR(50) NOT NULL,
    website VARCHAR(100),
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_updated_at_dep ON department USING btree (updated_at);
CREATE UNIQUE INDEX idx_institution_dep ON department USING btree (institution_id);
CREATE UNIQUE INDEX idx_id_dep ON department USING btree (id);
CREATE INDEX idx_enabled_dep ON department USING btree (enabled);
CREATE INDEX idx_created_at_dep ON department USING btree (created_at);
CREATE INDEX idx_city_id_dep ON department USING btree (city_id);


CREATE TABLE disease (
    id SERIAL,
    cie10_code VARCHAR(20) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    description text,
    name VARCHAR(1000) NOT NULL,
    privacy_level integer NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id, cie10_code)
);
CREATE UNIQUE INDEX idx_id_disease ON disease USING btree (id);
CREATE INDEX idx_created_at_disease ON disease USING btree (created_at);
CREATE INDEX idx_cie10_disease ON disease USING btree (cie10_code);
CREATE INDEX idx_enabled_disease ON disease USING btree (enabled);
CREATE INDEX idx_pvt_level_disease ON disease USING btree (privacy_level);
CREATE INDEX idx_updated_at_disease ON disease USING btree (updated_at);


CREATE TABLE disease_aggregation (
    id SERIAL,
    aggregation_id integer NOT NULL,
    disease_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_aggregation_disease ON disease_aggregation USING btree (aggregation_id);
CREATE INDEX idx_aggregation_disease_agg ON disease_aggregation USING btree (id);
CREATE INDEX idx_updated_at_disease_agg ON disease_aggregation USING btree (updated_at);
CREATE INDEX idx_enabled_disease_agg ON disease_aggregation USING btree (enabled);
CREATE INDEX idx_disease_id_agg ON disease_aggregation USING btree (disease_id);
CREATE INDEX idx_created_at_disease_agg ON disease_aggregation USING btree (created_at);


CREATE TABLE geofence (
    id SERIAL,
    name VARCHAR(100) NOT NULL,
    description text,
    polygon GEOMETRY NOT NULL,
    parent_geofence_id integer,
    granularity_level integer,
    city_id integer,
    geo_tag integer,
    population integer DEFAULT 1000,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX idx_updated_at_geofence ON geofence USING btree (updated_at);
CREATE INDEX idx_geo_tag_geofence ON geofence USING btree (geo_tag);
CREATE INDEX idx_created_at_geofence ON geofence USING btree (created_at);
CREATE INDEX idx_gran_level_geofence ON geofence USING btree (granularity_level);
CREATE INDEX idx_city_id_geofence ON geofence USING btree (city_id);
CREATE INDEX idx_parent_geofence_id ON geofence USING btree (parent_geofence_id);
CREATE INDEX idx_polygon_geofence ON geofence USING GIST (polygon);
CREATE UNIQUE INDEX idx_id_geofence ON geofence USING btree (id);


CREATE TABLE geofences_groups (
    id SERIAL,
    group_id integer NOT NULL,
    geofence_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX idx_created_at_geofences_group ON geofences_groups USING btree (created_at);
CREATE INDEX idx_geofence_id_geofences_groups ON geofences_groups USING btree (geofence_id);
CREATE INDEX idx_group_id_geofences_groups ON geofences_groups USING btree (group_id);
CREATE UNIQUE INDEX idx_id_geofences_groups ON geofences_groups USING btree (id);
CREATE INDEX idx_updated_at_geofences_groups ON geofences_groups USING btree (updated_at);


CREATE TABLE institution (
    id SERIAL,
    city_id integer NOT NULL,
    name VARCHAR(100) NOT NULL,
    description text,
    website VARCHAR(200),
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    location GEOMETRY NOT NULL,
    PRIMARY KEY (id)
);
CREATE INDEX idx_updated_at_institution ON institution USING btree (updated_at);
CREATE UNIQUE INDEX idx_id_institution ON institution USING btree (id);
CREATE INDEX idx_created_at_institution ON institution USING btree (created_at);
CREATE INDEX idx_cit_id_institution ON institution USING btree (city_id);
CREATE INDEX idx_enabled_institution ON institution USING btree (enabled);


CREATE TABLE patient (
    id SERIAL,
    city_id integer NOT NULL,
    institution_id integer NOT NULL,
    department_id integer NOT NULL,
    disease_id integer NOT NULL,
    geofence_id integer NOT NULL,
    age_range integer NOT NULL,
    gender VARCHAR(1) NOT NULL,
    registered_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    enabled boolean NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_institution_patient ON patient USING btree (institution_id);
CREATE INDEX idx_geofence_id_patient ON patient USING btree (geofence_id);
CREATE INDEX idx_enabled_patient ON patient USING btree (enabled);
CREATE INDEX idx_gender_patient ON patient USING btree (gender);
CREATE INDEX idx_department_patient ON patient USING btree (department_id);
CREATE INDEX idx_city_patient ON patient USING btree (city_id);
CREATE INDEX idx_created_at_patient ON patient USING btree (created_at);
CREATE INDEX idx_registered_at_patient ON patient USING btree (registered_at);
CREATE INDEX idx_age_range_patient ON patient USING btree (age_range);
CREATE INDEX idx_disease_id_patient ON patient USING btree (disease_id);
CREATE UNIQUE INDEX idx_patient_id ON patient USING btree (id);
CREATE INDEX idx_updated_at_patient ON patient USING btree (updated_at);

CREATE TABLE patient_age (
    id SERIAL,
    name VARCHAR(20) NOT NULL,
    description VARCHAR(200) NOT NULL,
    start_age integer NOT NULL,
    end_age integer NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'años',
    privacy_level integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_age_id ON patient_age USING btree (id);
CREATE INDEX idx_start_age ON patient_age USING btree (start_age);
CREATE INDEX idx_end_age ON patient_age USING btree (end_age);
CREATE INDEX idx_priv_lev_age ON patient_age USING btree (privacy_level);
CREATE INDEX idx_updated_at_age ON patient_age USING btree (updated_at);
CREATE INDEX idx_created_at_age ON patient_age USING btree (created_at);


CREATE TABLE geofence_group (
    id SERIAL,
    privacy_level integer NOT NULL DEFAULT 0,
    name VARCHAR(50) NOT NULL,
    description text,
    geo_tag integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX idx_created_at_geofence_group ON geofence_group USING btree (created_at);
CREATE INDEX idx_created_by_geofence_group ON geofence_group USING btree (created_by);
CREATE INDEX idx_geo_tag_geofence_group ON geofence_group USING btree (geo_tag);
CREATE INDEX idx_id_geofence_group ON geofence_group USING btree (id);
CREATE INDEX idx_pvt_level_geofence_group ON geofence_group USING btree (privacy_level);
CREATE INDEX idx_updated_at_geofence_group ON geofence_group USING btree (updated_at);


CREATE TABLE "user" (
    id SERIAL,
    role_id integer NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    username VARCHAR(20) NOT NULL,
    password VARCHAR(20) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX idx_role_id ON "user" USING hash (role_id);
CREATE INDEX idx_updated_at_user ON "user" USING btree (updated_at);
CREATE UNIQUE INDEX idx_user_index ON "user" USING btree (id);
CREATE INDEX idx_created_at_user ON "user" USING btree (created_at);


CREATE TABLE user_role (
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    id SERIAL,
    name VARCHAR(20) NOT NULL,
    privacy_level INTEGER NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX idx_prv_lev_user_role ON user_role USING hash (privacy_level);
CREATE INDEX idx_created_at_user_role ON user_role USING btree (created_at);
CREATE INDEX idx_updated_at_user_role ON user_role USING btree (updated_at);
CREATE INDEX idx_user_role_id ON user_role USING btree (id);


CREATE TABLE weather (
    id SERIAL,
    registered_at timestamp with time zone,
    humedad numeric,
    nubosidad numeric,
    precip numeric,
    max_temp numeric,
    min_temp numeric,
    evap numeric,
    recorrido_viento numeric,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_id_weather ON weather USING btree (id);
CREATE INDEX idx_registered_at_weather ON weather USING btree (registered_at);

CREATE TABLE city_place (
    id SERIAL,
    city_id integer NOT NULL,
    related_geofence integer,
    related_geofence_name VARCHAR(100),
    "type" VARCHAR(20) NOT NULL DEFAULT 'place',  -- can be 'intersection' or 'place'
    place_name VARCHAR (200) NOT NULL,
    location GEOMETRY DEFAULT NULL, -- if intersection, then geometry is a the point
    PRIMARY KEY (id)
);
CREATE INDEX idx_geofence_id_city_place ON city_place USING btree (related_geofence);
CREATE INDEX idx_id_city_place ON city_place USING btree (id);
CREATE INDEX idx_type_city_place ON city_place USING btree ("type");
CREATE INDEX idx_place_name_city_place ON city_place USING btree (place_name);
CREATE INDEX idx_geofence_name_city_place ON city_place USING btree (related_geofence_name);
CREATE INDEX idx_cit_id_city_places ON city_place USING btree (city_id);

ALTER TABLE ONLY aggregation
    ADD CONSTRAINT fk_agg_type FOREIGN KEY (aggregation_type) REFERENCES aggregation_type(id);

ALTER TABLE ONLY disease_aggregation
    ADD CONSTRAINT fk_aggregation FOREIGN KEY (aggregation_id) REFERENCES aggregation(id) ON DELETE CASCADE;

ALTER TABLE ONLY disease_aggregation
    ADD CONSTRAINT fk_agg_disease FOREIGN KEY (disease_id) REFERENCES disease(id) ON DELETE CASCADE;

ALTER TABLE ONLY geofence
    ADD CONSTRAINT fk_auto_geofence FOREIGN KEY (parent_geofence_id) REFERENCES geofence(id);

ALTER TABLE ONLY institution
    ADD CONSTRAINT fk_city_institution FOREIGN KEY (city_id) REFERENCES city(id) ON DELETE CASCADE;

ALTER TABLE ONLY department
    ADD CONSTRAINT fk_city_department FOREIGN KEY (city_id) REFERENCES city(id) ON DELETE CASCADE;

ALTER TABLE ONLY department
    ADD CONSTRAINT fk_department_institution FOREIGN KEY (institution_id) REFERENCES institution(id) ON DELETE CASCADE;

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_disease_id FOREIGN KEY (disease_id) REFERENCES disease(id);

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_department FOREIGN KEY (department_id) REFERENCES department(id);

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_city FOREIGN KEY (city_id) REFERENCES city(id);

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_geofence_id FOREIGN KEY (geofence_id) REFERENCES geofence(id);

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_institution_id FOREIGN KEY (institution_id) REFERENCES institution(id);

ALTER TABLE ONLY patient
    ADD CONSTRAINT fk_patient_age_range_id FOREIGN KEY (age_range) REFERENCES patient_age(id);

ALTER TABLE ONLY city
    ADD CONSTRAINT fk_city_geofence FOREIGN KEY (geofence_id) REFERENCES geofence(id);

ALTER TABLE ONLY geofences_groups
    ADD CONSTRAINT fk_polygon_geofences_groups FOREIGN KEY (group_id) REFERENCES geofence_group(id) ON DELETE CASCADE;

ALTER TABLE ONLY geofences_groups
    ADD CONSTRAINT fk_geofences_groups_id FOREIGN KEY (geofence_id) REFERENCES geofence(id) ON DELETE CASCADE;

ALTER TABLE ONLY "user"
    ADD CONSTRAINT fk_user_role_id FOREIGN KEY (role_id) REFERENCES user_role(id);


--
-- PostgreSQL database DDL complete
--