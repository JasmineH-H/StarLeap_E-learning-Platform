DB dump directory

This folder contains JSON exports of MongoDB collections. Use the project-level npm scripts to export/import.

Export collections to `db-dump-json/`:

  npm run db:export

Import collections from `db-dump-json/` into the database (this will replace data):

  npm run db:import

You can set `MONGO_URI` and `MONGO_DB` environment variables to control the target database. By default the scripts use `mongodb://localhost:27017` and database `curiocamp`.

Do NOT commit sensitive data. These files are useful for sharing small development datasets.
