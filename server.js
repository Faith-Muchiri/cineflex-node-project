const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({path: './config.env'});

process.on('uncaughtException', (err) => {
    console.log(err.name, err.message);
    console.log('Uncaught exception occured! Shutting down...');
    process.exit(1);//uncaught exception

})

const app = require('./app');

// console.log(app.get('env'))
console.log(process.env)

mongoose.connect(process.env.CONN_STR, {
    useNewUrlParser: true
}).then((conn) =>{
    // console.log(conn);
    console.log('DB Connection Successful')
})


const port = process.env.PORT || 5001

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}...`)
})

process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    console.log('Unhandled rejection occured! Shutting down...');

    server.close(() => {
        process.exit(1);//uncaught exception
    })
})


