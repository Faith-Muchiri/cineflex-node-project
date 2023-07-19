const express = require('express');
const morgan = require('morgan')
const moviesRouter = require('./Routes/moviesRoutes')
const authRouter = require('./Routes/authRouter')
const CustomError = require('./Utils/CustomError')
const globalErrorHandler = require('./Controllers/errorController');


const app = express();
app.use(express.json());

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

app.use(express.static('./public'))

app.use('/api/v1/movies', moviesRouter);
app.use('/api/v1/users', authRouter);
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `can't find ${req.originalUrl} on the server!`
    // })
    // const err = new Error(`can't find ${req.originalUrl} on the server!`);
    // err.status = 'fail';
    // err.statusCode = 404;
    const  err = new CustomError(`can't find ${req.originalUrl} on the server!`, 404);
    next(err);

});

app.use(globalErrorHandler);

module.exports = app;