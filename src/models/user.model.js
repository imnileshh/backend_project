import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username: {
            type: String,
            trim: true,
            unique: true,
            lowercase: true,
            required: true,
            index: true  // to enable search on username 
        },
        email: {
            type: String,
            trim: true,
            unique: true,
            lowercase: true,
            required: true,
        },
        fullName: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
        },
        avatar: {
            type: String,  // claudinary URL
            required: true
        },
        coverImage: {
            type: String,  // claudinary URL
        },
        password: {
            type: String,
            required: true
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        refreshToken: {
            type: String
        }
    },
    { timestamps: true }
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

// userSchema.pre("save", function (next) {
//     if (!this.isModified("password")) return next();

//     bcrypt.hash(this.password, 10).then((hashedPassword) => {
//         this.password = hashedPassword;
//         next();
//     }).catch((error) => next(error))
// });

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

// Access Token

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            //payload
            _id: this._id,
            username: this.username,
            email: this.email,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,  // Secret Key
        {
            expiresIn: ACCESS_TOKEN_EXPIRY,  //Token Expiry
        }
    );
};

//Refresh Token 

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}



export const User = mongoose.model("User", userSchema)