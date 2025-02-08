import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API,
    api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
});

const uploadOnCloudinary = async (fileLocalPath) => {
    try {
        if (!fileLocalPath) return null

        const response = await cloudinary.uploader.upload(fileLocalPath, {
            resource_type: "auto"
        })
        // console.log("cloudinary file upload response", response)  // check other response.options
        fs.unlinkSync(fileLocalPath)
        return response
    } catch (error) {
        // if upload fails delete from loacal server
        fs.unlinkSync(fileLocalPath)
        console.log("Failed to uplaod on Cloudinary:", error)
        return null
    }
}

export { uploadOnCloudinary }