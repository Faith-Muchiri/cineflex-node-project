const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Movie = require('./../Models/movieModel');

dotenv.config({path: './config.env'});

// CONNECT TO MONGODB
mongoose.connect(process.env.CONN_STR, {
    useNewUrlParser: true
}).then((conn) =>{
    console.log('DB Connection Successful')
}).catch((error) => {
    console.log('Some error has occurred');
});

// READ MOVIES.JSON FILE
const movies = JSON.parse(fs.readFileSync('./data/movies.json', 'utf-8'));

// DELETE EXISTING MOVIE DOCUMENTS FROM COLLECTION
const deleteMovies = async(req, res) => {
    try{
        await Movie.deleteMany();
        console.log('Data successfully deleted')
    }catch(err){
        console.log(err.message);
    }
    process.exit();
}

// IMPORT DATA TO MONGODB COLLECTION
const importMovies = async(req, res) => {
    try{
        await Movie.create(movies);
        console.log('Data successfully imported!')
    }catch(err){
        console.log(err.message);
    }
    process.exit();
}

// console.log(process.argv)
if(process.argv[2] === '--import'){
    importMovies();
}
if(process.argv[2] === '--delete'){
    deleteMovies();
}