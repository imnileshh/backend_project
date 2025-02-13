import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User"  // the one who is subscribing e.g nilesh
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User" //the one whom subscriber (nilesh) is subscribing to (chaiaurcode)
        }
    }
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)