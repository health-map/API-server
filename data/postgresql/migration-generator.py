# coding=utf-8
# Migration Script to generate some queries of migration.sql
import pandas as pd
import json
import sys  
reload(sys)  
sys.setdefaultencoding('utf8')

generate = "GEOFENCES"

if generate == "AGGREGATION":
  agg_capitulos = pd.read_csv("./raw_data/diseases/capitulos.csv")
  agg_agrup = pd.read_csv("./raw_data/diseases/agrupaciones.csv")

  for index, row in agg_capitulos.iterrows():
    print "(0, 1, '" + row["name"] + "','Capítulo " + str(row["index"]) + ": " + row["descripcion"] + "', NULL, TRUE),"

  subcapitulo = 0
  cap_actual = -1
  for index, row in agg_agrup.iterrows():
    if cap_actual != row["cap"]:
      subcapitulo = 1
      cap_actual = row["cap"]
    print "(0, 2, '" + row["name"] + "','Capítulo " + str(row["cap"]) + "." + str(subcapitulo) + ": " + row["cods"]  + "', NULL, TRUE),"
    subcapitulo += 1

elif generate == "DISEASE":
  #(cie10_code, description, "name", privacy_level)
  agg_disease = pd.read_csv("./raw_data/diseases.csv")
  f = open("./generator_output.csv", "w")
  for index, row in agg_disease.iterrows():
    f.write("('" + row["id10"] + "', '" + row["dec10"] +  "', '" + row["dec10"]  +  "', 0), \n")
    #print "('" + row["id10"] + "', '" + row["dec10"] +  "', '" + row["dec10"]  +  "', 0)";
  f.close()

elif generate == "DISEASE_AGGREGATION":
  agg_capitulos = pd.read_csv("./raw_data/capitulos.csv")
  agg_agrup = pd.read_csv("./raw_data/agrupaciones.csv")
  agg_disease = pd.read_csv("./raw_data/diseases.csv")


  general_insertion_index = 1
  agrupations_with_index = []
  for index, row in agg_capitulos.iterrows():
    ini = row["ini"]
    fin = row["fin"]
    agrupations_with_index.append([general_insertion_index, ini, fin])
    general_insertion_index += 1

  for index, row in agg_agrup.iterrows():
    ini = row["ini"]
    fin = row["fin"]
    agrupations_with_index.append([general_insertion_index, ini, fin])
    general_insertion_index += 1
  
  f = open("./generator_output.csv", "w")
  disease_index = 1
  for index, row in agg_disease.iterrows():
    cie10 = row["id10"]
    cie10letter = cie10[0]
    try:
      cie10digits = int(cie10[1:3])
    except:
      print cie10
      continue
    for agrupation in agrupations_with_index:
      aggregation_index = agrupation[0] 
      letraStart = agrupation[1][0]
      letraEnd = agrupation[2][0]
      numStart = int(agrupation[1][1:3])
      numEnd = int(agrupation[2][1:3])
      if (cie10letter.upper() >= letraStart.upper() and cie10letter.upper() <= letraEnd.upper()) \
        and (cie10digits >= numStart and cie10digits <= numEnd):
          #(aggregation_id, disease_id)
          #print "(" + str(aggregation_index) + ", " + str(disease_index) + "),"
          f.write("(" + str(aggregation_index) + ", " + str(disease_index) + "),\n")
    disease_index += 1
  f.close()

elif generate == "GEOFENCES":
  f = open("./generator_output.csv", "w")
  ids_mapping = []
  with open('./raw_data/geofences/gye_general.geojson') as geo_gye_general:
    city_geo = json.load(geo_gye_general)

  with open('./raw_data/geofences/parroquias_urbanas.geojson') as geo_gye_parr:
    parr_geo = json.load(geo_gye_parr)

  with open('./raw_data/geofences/sectors.geojson') as geo_gye_sectors:
    sectors_geo = json.load(geo_gye_sectors)

  current_id = 1
  f.write('INSERT INTO healthmap.geofence\n') 
  f.write('\t("name", description, polygon, parent_geofence_id, granularity_level, city_id, geo_tag, population)\nVALUES\n')
  # ST_GeometryFromText('POLYGON((50.6373 3.0750,50.6374 3.0750,50.6374 3.0749,50.63 3.07491,50.6373 3.0750))')
  # ("name", description, polygon, parent_geofence_id, granularity_level, city_id, geo_tag, population)
  # granularity: 5, parent: NULL, city: 1
  for feature in city_geo['features']:
    if feature['properties']['dpa_tipo'] == "CAPITAL PROVINCIAL": #guayaquil city
      polygon = ''
      for i, c in enumerate(feature['geometry']['coordinates']):
        for coord, (lat, lon) in enumerate(c[0]):
          polygon = polygon + str(lat) + ' ' + str(lon)
          if (coord != len(c[0]) - 1):
            polygon += ', '
        f.write("('GUAYAQUIL', 'Ciudad de Guayaquil', ST_GeometryFromText('POLYGON((" + polygon  +  "))'), NULL, 5, 1, NULL, 2644891), \n")
        print current_id, "('GUAYAQUIL', 'Ciudad de Guayaquil', ST_GeometryFromText('POLYGON(())'), NULL, 5, 1, NULL, 2644891),"
        ids_mapping.append({
          'id': current_id,
          'name': 'GUAYAQUIL'
        })
        current_id += 1
  
  # granularity: 6, parent: 1, city: 1
  for feature in parr_geo['features']:
    polygon = ''
    name = feature['properties']['parroquia_']
    for i, c in enumerate(feature['geometry']['coordinates']):
      for coord, (lat, lon) in enumerate(c[0]):
        polygon = polygon + str(lat) + ' ' + str(lon)
        if (coord != len(c[0]) - 1):
          polygon += ', '
      f.write("('" + name + "', 'Parroquia Urbana " + name +  " ', ST_GeometryFromText('POLYGON((" + polygon  +  "))'), 1, 6, 1, NULL, 0), \n")
      print current_id, "('" + name + "', 'Parroquia Urbana " + name +  " ', ST_GeometryFromText('POLYGON(())'), 1, 6, 1, NULL, 0),"
      ids_mapping.append({
        'id': current_id,
        'name': name
      })
      current_id +=1 

  # granularity: 7, parent: SEARCH, city: 1
  for feature in sectors_geo['features']:
    polygon = ''
    if 'Name' not in feature['properties']:
      continue
    name = feature['properties']['Name'].encode('utf-8').upper()
    if name == '':
      continue
    found_parent_id = 'NULL'
    parent = 'NULL'
    if 'parent' in feature['properties']:
      parent = feature['properties']['parent']
      found_parent_ids = [x for x in ids_mapping if x['name'] == parent]
      if len(found_parent_ids) >= 1:
        found_parent_id = found_parent_ids[0]['id']
    for i, c in enumerate(feature['geometry']['coordinates']):
      for coord, (lat, lon) in enumerate(c):
        polygon = polygon + str(lat) + ' ' + str(lon)
        if (coord != len(c) - 1):
          polygon += ', '
      f.write("('" + name + "', 'Sector " + name +  "', ST_GeometryFromText('POLYGON((" + polygon  +  "))'), " + str(found_parent_id) + ", 7, 1, NULL, 0), \n")
      print current_id, parent, "('" + name + "', 'Sector " + name + "', " + str(found_parent_id) + ", 7, 1, NULL, 0),"

      ids_mapping.append({
        'id': current_id,
        'name': name
      })
      current_id +=1 


  f.write('INSERT INTO healthmap.city_place\n') 
  f.write('\t(city_id, related_geofence_name, related_geofence, "type", place_name, location)\nVALUES\n')
  geo_city_places = pd.read_csv('./raw_data/city_places/city_place.csv')
  for i, city_place in geo_city_places.iterrows():
    place_name = city_place["Sector"]
    related_geofence_name = city_place["SectorShapeName"]
    related_geofence_id = None
    for geofence in ids_mapping:
      if geofence['name'] == related_geofence_name:
        related_geofence_id = geofence['id']
        break
    if related_geofence_id == None:
      print 'not found', related_geofence_name
    f.write("(1, '" + related_geofence_name +  "', " + str(related_geofence_id)  +  ", 'place', '" + place_name + "' , NULL), \n")

  #NAME;SIMPLESPEL;DISTRICTCO;ALIAS;lon;lat
  geo_city_intersections = pd.read_csv('./raw_data/city_places/city_intersections.csv', sep=";")
  for i, city_intersection in geo_city_intersections.iterrows():
    place_name = city_intersection['SIMPLESPEL'].replace("'", "")
    lat = float(city_intersection['lat'].replace(',', '.'))
    lon = float(city_intersection['lon'].replace(',', '.'))
    if (lon < -79.84725952148438 and lon > -80.10475158691406
      and lat > -2.2962143085146574 and lat < -1.99910598312332):
      f.write("(1, NULL, NULL, 'intersection', '" + place_name + "' , ST_GeometryFromText('POINT("+ str(lon) + " " +  str(lat) +  ")')), \n")
  f.close()

else:
  None

