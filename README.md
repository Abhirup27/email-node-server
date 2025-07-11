# email-node-server
My aws instance:


There are only 3 main dependencies:
```json
"dependencies": {
"cookie-parser": "^1.4.7",
"dotenv": "^16.5.0",
"express": "^5.1.0"
},
```
The other two, bullmq and ioredis are optional. That is what I am using in my aws instance.
If you want to run and test using only the required dependencies, run:

```shell
npm run install:basic
OR
npm install --no-optional
```
If you want to also test the redis and bullmq implementation, install:
```shell
npm run install:all
OR
npm install
```
In your env file:


I have provided two routes currently, 1 GET route /
