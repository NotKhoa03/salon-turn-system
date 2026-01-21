/**
 * Seed Admin Script
 *
 * Creates the initial admin user for the Nail Salon POS system.
 *
 * Usage:
 *   npx ts-node scripts/seed-admin.ts
 *
 * Required environment variables:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ADMIN_EMAIL (optional, defaults to admin@salon.com)
 *   - ADMIN_PASSWORD (optional, defaults to changeme123)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL || "admin@salon.com";
const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAdmin() {
  console.log("Creating admin user...");
  console.log(`Email: ${adminEmail}`);

  // Create user with admin role in metadata
  const { data: userData, error: createError } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Admin",
        role: "admin",
      },
    });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      console.log("Admin user already exists. Updating role...");

      // Update existing user's profile to admin
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("email", adminEmail);

      if (updateError) {
        console.error("Failed to update profile:", updateError.message);
        process.exit(1);
      }

      console.log("Admin role updated successfully!");
      return;
    }

    console.error("Failed to create user:", createError.message);
    process.exit(1);
  }

  console.log("Admin user created successfully!");
  console.log(`User ID: ${userData.user?.id}`);
  console.log("");
  console.log("Login credentials:");
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("");
  console.log("⚠️  Please change the password after first login!");
}

seedAdmin().catch(console.error);
