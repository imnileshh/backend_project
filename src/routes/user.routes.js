import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser, changeUserPassword, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelInfo, getUserWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },

    ]),
    registerUser);

router.route("/login").post(upload.none(), loginUser)

// secured Routes (works only if user is logged in)
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").patch(verifyJWT, upload.none(), changeUserPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-details").patch(verifyJWT, upload.none(), updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/upadte-coverimage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelInfo)
router.route("/history").get(verifyJWT, getUserWatchHistory)
export default router