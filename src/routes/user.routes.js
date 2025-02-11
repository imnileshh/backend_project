import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser, changeUserPassword, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser);

// secured Routes (works only if user is logged in)
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeUserPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-details").post(verifyJWT, updateAccountDetails)
router.route("/update-avatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/upadte-coverimage").post(verifyJWT, upload.single("coverImage"), updateUserCoverImage)


export default router