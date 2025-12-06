import { Webhook } from "svix";
import User from "../models/User.js";

// API Controller Function to Manage Clerk User with database
// POST /api/clerk
const clerkWebhooks = async (req, res) => {
  try {
    console.log("=== 🔔 CLERK WEBHOOK START ===");

    // Create a Svix instance with clerk webhook secret.
    console.log("1. Checking CLERK_WEBHOOK_SECRET...");
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    // Getting Headers
    console.log("2. Getting headers...");
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };
    console.log("Headers:", headers);

    // Verifying Headers
    console.log("3. Verifying webhook signature...");
    await whook.verify(JSON.stringify(req.body), headers);
    console.log("✅ Webhook verification successful");

    // Getting Data from request body
    console.log("4. Parsing request body...");
    const { data, type } = req.body;
    console.log("Webhook type:", type);
    console.log("User data:", {
      id: data.id,
      email: data.email_addresses?.[0]?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      image: data.image_url
    });

    const userData = {
      _id: data.id,
      email: data.email_addresses[0].email_address,
      username: data.first_name + " " + data.last_name,
      image: data.image_url,
    };

    console.log("5. Prepared userData for MongoDB:", userData);

    // Switch Cases for differernt Events
    console.log("6. Processing event type:", type);
    switch (type) {
      case "user.created": {
        console.log("🆕 Creating user in MongoDB...");
        await User.create(userData);
        console.log("✅ User created successfully");
        break;
      }

      case "user.updated": {
        console.log("📝 Updating user in MongoDB...");
        await User.findByIdAndUpdate(data.id, userData);
        console.log("✅ User updated successfully");
        break;
      }

      case "user.deleted": {
        console.log("🗑️ Deleting user from MongoDB...");
        await User.findByIdAndDelete(data.id);
        console.log("✅ User deleted successfully");
        break;
      }

      default:
        console.log("⚠️ Unknown event type:", type);
        break;
    }

    console.log("=== ✅ CLERK WEBHOOK COMPLETED ===");
    res.json({ success: true, message: "Webhook Recieved" });
    
  } catch (error) {
    console.log("=== ❌ CLERK WEBHOOK ERROR ===");
    console.log("ERROR MESSAGE:", error.message);
    console.log("ERROR STACK:", error.stack);
    console.log("=== ❌ END ERROR ===");
    res.json({ success: false, message: error.message });
  }
};

export default clerkWebhooks;