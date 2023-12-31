const User = require('./../Models/userModel');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const jwt = require('jsonwebtoken');
const CustomError = require('./../Utils/CustomError');
const util = require('util');
const sendEmail = require('./../Utils/email');
const crypto = require('crypto')

const signToken = id => {
    return jwt.sign({ id }, process.env.SECRET_STR, {
        expiresIn: process.env.LOGIN_EXPIRES
    })
}

exports.signup = asyncErrorHandler(async(req, res, next) => {
    const newUser = await User.create(req.body);

    const token = signToken(newUser._id);

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: newUser
        }
    });
})

exports.login = asyncErrorHandler(async(req,res,next) => {
    // const {email, password} = req.body //destructuring or
    const email = req.body.email;
    const password = req.body.password;

    // check if email & password is present in the request body
    if(!email || !password){
        const error = new CustomError('Please provide email ID and Password for login!', 400);
        return next(error);//call global error handling middleware
    }

    // Check if user exists with given email
    const user = await User.findOne({ email }).select('+password');

    // const isMatch = await user.comparePasswordInDb(password, user.password);
    //Check if the user exists & password matches
    if(!user || !(await user.comparePasswordInDb(password, user.password))){
        const error = new CustomError('Incorrect email or password', 400);
        return next(error);
    }

    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token
        // user
    });
})


//protecting routes
exports.protect = asyncErrorHandler(async(req,res, next) => {
    // 1. Read the token & check if it exist
    const testToken = req.headers.authorization;
    let token;
    if(testToken && testToken.startsWith('Bearer')){
        token = testToken.split(' ')[1];
    }
    if(!token){
        next(new CustomError('You are not logged in!',401))
    }

    // 2. validate the token
    const decodedToken = await util.promisify(jwt.verify)(token, process.env.SECRET_STR);

    // 3. if the user exists
    const user = await User.findById(decodedToken.id);

    if(!user){
        const error = new CustomError('The user with the given token does not exist', 401);
        next(error);
    }

    const isPasswordChanged = await user.isPasswordChanged(decodedToken.iat);
    // 4. If the user changed password after the token was issued
    if(isPasswordChanged){
        const error = new CustomError('The password has been changed recently. Please login again', 401);
        return next(error);
    }
    // 5. Allow user to access protected route
    req.user = user;
    next()
})


//user Roles and Permission
exports.restrict = (role) => {
    return (req,res,next) => {
        if(req.user.role !== role){
            const error = new CustomError('You do not have permission to perform this action', 404);
            next(error);
        }
        next();

    }
}

// // multiple user roles to perform an action use 
// // ...Rest parameter(es6)
// exports.restrict = (...role) => {
//     return (req,res,next) => {
//         if(!role.includes(req.user.role)){
//             const error = new CustomError('You do not have permission to perform this action', 404);
//             next(error);
//         }
//         next();
//     }
// }

exports.forgotPassword = asyncErrorHandler(async(req, res, next) => {
    // 1. GET USER BASED ON POSTED EMAIL
    const user = await User.findOne({email: req.body.email});

    if(!user){
        const error = new CustomError('We could not find the user with given email', 404);
        next(error);
    }
    // 2.GENERATE A RANDOM RESET TOKEN
    const resetToken = user.createResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // 3. SEND THE TOKEN BACK TO THE USER EMAIL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword${resetToken}`;
    const message = `We have received a password reset request. Please use the below link to reset your password\n\n${resetUrl}\n\nThis reset password link will be valid only for 10 minutes.`;

    try{
        await sendEmail({
            email: user.email,
            subject: 'Password change request received',
            message: message
        });

        res.status(200).json({
            status: 'success',
            message: 'Password reset link sent to the user email'
        })
    }catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;
        user.save({validateBeforeSave: false});

        return next(new CustomError('There was an error sending password reset email. Please try again later', 500));
    }
    
})

exports.resetPassword = asyncErrorHandler(async(req, res, next) => {
    // 1. IF THE USER EXISTS WITH THE GIVEN TOKEN & TOKEN HAS NOT EXPIRED
    const token = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({passwordResetToken: token, passwordResetTokenExpires: {$gt: Date.now()}});


    if(!user){
        const error = new CustomError('Token is invalid or has expired!', 400);
        next(error);
    }

    //2. RESETING THE USER PASSWORD
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = Date.now();

    user.save();

    // 3. LOGIN THE USER
    const loginToken = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token: loginToken
        // user
    });
})