import { asyncHandler } from "../utils/asyncHandler.js"
import apiError from "../utils/apiErrors.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/apiErrors.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import ApiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary"
import mongoose from "mongoose";


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
};

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
});

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
});


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
});

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
});

const changeUserPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword, confNewPassword } = req.body;

    if (!(newPassword === confNewPassword)) {
        throw new ApiError(400, "NewPassword and ConfirmNewPassword are different")
    }
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Enter old password correctly")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password Changed Succesfully")
        )
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "User fetched successfully")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { email, fullName } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Details updated Successfully")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(400, "User Not found")
    }

    // const oldAvatarUrl = user.avatar;
    // const avatarPublicId = oldAvatarUrl?.split("/").pop().split(".")[0];
    const oldAvatarUrl = user.avatar;
    let avatarPublicId = null;

    if (oldAvatarUrl) {
        const parts = oldAvatarUrl.split("/");
        const filename = parts.pop();
        avatarPublicId = filename?.split(".")[0]; // Extract Cloudinary public ID
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) {
        throw new apiError(400, "Error while uploading Avatar")
    }

    if (avatarPublicId) {
        const oldAvatarDeleted = await cloudinary.uploader.destroy(avatarPublicId);
        if (!["ok", "not found"].includes(oldAvatarDeleted.result)) {
            throw new ApiError(500, "Failed to delete old avatar");
        }
    }

    user.avatar = avatar.url;
    await user.save({ validateBeforeSave: false })


    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar Changed Successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover image file is missing")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(400, "usernot found")
    }

    const oldCoverImageUrl = user.coverImage;
    let coverImagePublicId = null;
    if (oldCoverImageUrl) {
        const parts = oldCoverImageUrl.split("/");
        const filename = parts.pop();
        coverImagePublicId = filename?.split(".")[0];
    };

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage?.url) {
        throw new apiError(500, "Failed to upload coverImage")
    }

    if (coverImagePublicId) {
        const oldCoverImageDeleted = await cloudinary.uploader.destroy(coverImagePublicId);
        if (!["ok", "not found"].includes(oldCoverImageDeleted.result)) {
            throw new ApiError(500, "Failed to delete old cover image");
        }
    }

    user.coverImage = coverImage.url
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "CoverImage changed successfully")
        );
})

const getUserChannelInfo = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowercase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new apiError(404, "channel does not exists")
    }

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        )
})

const getUserWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        email: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "WatchHistory fetched Successfully"
            )
        )

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelInfo,
    getUserWatchHistory
};