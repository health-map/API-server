echo 'RESTORE HEALTH-MAP... '
echo "Give me the filename file execute: "
read FILENAME
printf 'Restoring from backup file:  "%s" \n' "$FILENAME"
docker cp ./data/postgresql/backups/$FILENAME api-server_postgres_1:backup.sql;
docker exec -it api-server_postgres_1 sh -c 'dropdb healthmap';
docker exec -it api-server_postgres_1 sh -c 'createdb healthmap';
docker exec -it api-server_postgres_1 sh -c 'psql healthmap < backup.sql';
echo "Finished!!"
