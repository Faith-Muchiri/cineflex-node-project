const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')

// name, email, password, confirmPassword, photo
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email'],
        trim: true
    },
    photo: String,
    role: {
        type: String,
        // enum: ['user', 'admin', 'super-admin', 'manager'],
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This validator will only work for save() and create()
            validator: function(val){
                return val === this.password;
            },
            message: 'Password and confirmPassword does not match!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date
})

userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();

    // encrypt the password before saving it
    this.password = await bcrypt.hash(this.password, 12);

    this.confirmPassword = undefined;
    next();
})

userSchema.methods.comparePasswordInDb = async function(pswd, pswdDB){
    return await bcrypt.compare(pswd, pswdDB);
}

userSchema.methods.isPasswordChanged = async function (JWTTimestamp) {
    if(this.passwordChangedAt){
        const pswdChangedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        console.log(pswdChangedTimestamp, JWTTimestamp);

        return JWTTimestamp < pswdChangedTimestamp;
    }
    return false;
}

userSchema.methods.createResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

    console.log(resetToken, this.passwordResetToken);
    
    return resetToken;

}

const User = mongoose.model('User', userSchema);
module.exports = User;