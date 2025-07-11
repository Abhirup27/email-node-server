# email-node-server

My aws instances: 
https://demo1.roop-backend.site

https://demo2.roop-backend.site

I have provided two routes , 1 GET route /api/v1/:key or /api/v1?key=<key> to fetch the current status.

The other one is /api/v1/send-email. You can see the required request body's contents in ./src/routes/test.http  
There are 5 dependencies.
There is also an in memory cache and a simple FIFO queue provider which do not depend on redis and bullmq

```json
"dependencies": {
"cookie-parser": "^1.4.7",
"dotenv": "^16.5.0",
"express": "^5.1.0",
"bullmq": "^5.56.2",
"ioredis": "^5.6.1"
},
```
install the dependencies by running:
        
```shell
npm install
"Do not run npm install --production or npm install --omit=dev as it will not install the typescript compiler to compile the src ts files to dist js files. 
Ignore if you have tsc compiler installed globally, but there are types for node.JS and express. 
So it will throw errors when compiling but that can be avoided by compiler options but I haven't tested that"
```

In the .env.development file (if you run npm run start:dev, otherwise see ./src/config/index.ts.):
```
PORT=3000
RATE_LIMITING_WINDOW=10
LOGGING=true
LOG_TO_FILE=true
LOG_LEVELS=debug,log,error,warn
REDIS_HOST=localhost
REDIS_PORT=6379
```
Run in development mode
```shell
npm run start:dev
```
For unit testing I have used Jest.

You can run the unit tests by the following, but note that I have never written tests before, and I spent most of the time coding the whole MVC architecture, email service and the queue providers.
Given the limited time I wasn't able to mock every provider correctly, so some tests fail. Out of the 48 tests 11 are failing. With the help of AI I wrote unit tests for the email service module and the cache module. It gave me a lot of wrong code, but I was able to fix some of them by myself.

```shell
npm run test
```

email.service.ts Is where the core logic of this task is. 
queue.service.ts acts as a factory to provide a type of queue to the email service. The EmailService class and the Queue Service class in a circular dependency, the function setEmailServiceInstance implemented by the FIFOQueue and bullMQ provider are used to inject the email service instance when the Email Service class instance is itself created.

The function processEmailJob in the Email service is called by the job queue instance. processEmailJob is where most of the logic of this email sending service is.

To handle idempotency, a router middleware is applied, as you can see in the api.routes.ts. Idempotency is to handle duplicate POST requests, it does so by using an unique key for every email, if the key already exists, the middleware checks if the request body's hash is different to the already existing one, if yes there is a collision and this key cannot be used.

If the authenticated user's email is different from the senderEmail in the existing cached data, a 401 error code is returned. Note that the authMiddleware assumes the user is authenticated by assigning user.email to the one in the request's body.
You can test it by setting user.email to by any other value and then sending a post request with the same key and body.
