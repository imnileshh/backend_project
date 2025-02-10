import { asyncHandler } from "../utils/asyncHandler.js"
import apiError from "../utils/apiErrors.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/apiErrors.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import ApiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();

        const refreshToken = user.generateRefreshToken();


        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: true });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating AccessToken and RefreshToken")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // console.log("req.body", req.body);
    const { email, password, username, fullName } = req.body;
    // console.log(password)

    //Validation for empty fields
    if (
        [username, fullName, email, password].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required")
    }

    // check for existing user

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        throw new ApiError(409, "user with given username or email already exist")
    }

    // check for images: Avatar, CoverImage
    // console.log("req.files", req.files);
    // console.log(req.files.coverImage)
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }

    // upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;
    // console.log("avatar", avatar)
    // console.log("cover", coverImage)

    if (!avatar) {
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    };

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get data => req.body
    // validate fields
    // check if user is persent
    // check password
    // access & refersh token
    // send this using Cookies
    // send Success  msg

    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Email or Username is required")
    }
    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    });
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid user credentials")
    }

    //get the Tokens from {generateAccessTokenAndRefreshToken} Function    
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    // get the data from req.user

    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        })

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User LoggedOut Successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    // get the RefreshToken
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unathorized request")
    }

    // Decode (Verify) the RefreshToken
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    // Get The user from decoded token
    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid Refresh Token")
    }

    // COMPARE incomingtoken with database Token
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token has expired or already used ");
    }

    // Generate New Tokens
    const { accessToken, newRefreshToken } = generateAccessTokenAndRefreshToken(user._id);

    // Update old Refresh Token with new one
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: true })

    // Send Response
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access Token Refreshed"
            )
        )
})



export { registerUser, loginUser, logoutUser, refreshAccessToken };