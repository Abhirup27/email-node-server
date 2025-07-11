# email-node-server

My aws instance:

There are 5 dependencies:
```json
"dependencies": {
"cookie-parser": "^1.4.7",
"dotenv": "^16.5.0",
"express": "^5.1.0",
"bullmq": "^5.56.2",
"ioredis": "^5.6.1"
},
```
There is also a in memory cache and a simple FIFO queue providers which do not depend on redis and bullmq
install the dependencies by running:
        
```shell
npm install
```

In the .env.development file:

```
PORT=3000
RATE_LIMITING_WINDOW=10
LOGGING=true
LOG_TO_FILE=boolean
LOG_LEVELS=debug,log,error,warn
REDIS_HOST=localhost
REDIS_PORT=6379
```
I have provided two routes , 1 GET route /api/v1/:key or /api/v1?key=<key> to fetch the current status.

The other one is /api/v1/send-email. You can see the required request body's contents in ./src/routes/test.http  

