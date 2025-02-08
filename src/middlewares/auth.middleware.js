import ApiError from "../utils/apiErrors.js";
import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    // if (res) is not used then replace with "_"
    try {
        // Get the Token from req.cookies OR req.Header
        const token = await req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized Request");
        }
        // Verify (Decode) The Token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // decodedToken Contains _id and Other Values 
        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken"
        );
        if (!user) {
            throw new ApiError(401, "Invalid Access");
        }

        // send user data using req.user
        req.user = user;
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})