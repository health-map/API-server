printf 'Running backup... \n '
today="$( date +"%Y%m%d" )"
number=0

fname=$today

while [ -e "$fname" ]; do
   fname='%s_%02d'
done

printf 'Saving into backup file:  "%s" \n' "$fname.sql"

docker exec -it api-server_postgres_1 pg_dump healthmap >> backup18082019.sql;
docker cp api-server_postgres_1:/backup.sql ./data/postgresql/backups/$fname.sql;
#rm backup.bak;
