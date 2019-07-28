printf 'Running backup... \n '
today="$( date +"%Y%m%d" )"
number=0

fname=$today

while [ -e "$fname" ]; do
   fname='%s_%02d'
done

printf 'Saving into backup file:  "%s" \n' "$fname.bak"

docker exec -it api-server_postgres_1 pg_dump healthmap >> backup.bak;
docker cp api-server_postgres_1:/backup.bak ./data/postgresql/backups/$fname.bak;
rm backup.bak;
