@echo off
echo Starting MongoDB manually...
cd /d "C:\Program Files\MongoDB\Server\8.0\bin"
mongod.exe --dbpath "C:\data\db" --logpath "C:\data\db\mongod.log" --fork
echo MongoDB started on port 27017
pause 