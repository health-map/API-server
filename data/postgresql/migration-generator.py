# coding=utf-8
# Migration Script to generate some queries of migration.sql
import pandas as pd
import json


generate = "GEOFENCES"

if generate == "AGGREGATION":
  agg_capitulos = pd.read_csv("./raw_data/capitulos.csv")
  agg_agrup = pd.read_csv("./raw_data/agrupaciones.csv")

  for index, row in agg_capitulos.iterrows():
    print "(0, 0, '" + row["name"] + "','Capítulo " + str(row["index"]) + ": " + row["descripcion"] + "', 0, TRUE),"

  subcapitulo = 0
  cap_actual = -1
  for index, row in agg_agrup.iterrows():
    if cap_actual != row["cap"]:
      subcapitulo = 1
      cap_actual = row["cap"]
    print "(0, 1, '" + row["name"] + "','Capítulo " + str(row["cap"]) + "." + str(subcapitulo) + ": " + row["cods"]  + "', 0, TRUE),"
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
      ids_mapping.append({
        'id': current_id,
        'name': name
      })
      current_id +=1 
  f.close()

else:
  None

